import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthModal } from '../components/AuthModal';
import { useResearchStore } from '../store/useResearchStore';

describe('Authentication Flow Suite (Section 11 Testing Requirements)', () => {
  beforeEach(() => {
    localStorage.clear();
    useResearchStore.getState().setUser(null, null);
    vi.restoreAllMocks();
  });

  it('does not render modal when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders sign in modal and toggles to registration mode', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Sign in to ResearchRabbit')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Dr. Jane Doe')).not.toBeInTheDocument();

    // Click "Create Account" toggle
    const createAccountBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(createAccountBtn);

    expect(screen.getByText('Create Researcher Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MIT / Computer Science')).toBeInTheDocument();

    // Click "Sign In" toggle back
    const signInToggleBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInToggleBtn);
    expect(screen.getByText('Sign in to ResearchRabbit')).toBeInTheDocument();
  });

  it('completes sign in successfully and updates store with user & token', async () => {
    const mockUser = {
      id: 'usr-101',
      email: 'marie.curie@sorbonne.edu',
      full_name: 'Dr. Marie Curie',
      institution: 'Sorbonne University',
    };

    // Mock fetch for login
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/auth/login') {
        return new Response(
          JSON.stringify({
            access_token: 'jwt-access-token-abc',
            refresh_token: 'jwt-refresh-token-xyz',
            token_type: 'bearer',
            user: mockUser,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    });

    const handleClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={handleClose} />);

    // Fill in credentials
    const emailInput = screen.getByPlaceholderText('researcher@university.edu');
    const passInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'marie.curie@sorbonne.edu' } });
    fireEvent.change(passInput, { target: { value: 'CurieLab2026!' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(useResearchStore.getState().user).toEqual(mockUser);
      expect(useResearchStore.getState().token).toBe('jwt-access-token-abc');
      expect(localStorage.getItem('rr_token')).toBe('jwt-access-token-abc');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('completes registration and sets authenticated user in store', async () => {
    const mockNewUser = {
      id: 'usr-202',
      email: 'feynman@caltech.edu',
      full_name: 'Dr. Richard Feynman',
      institution: 'Caltech',
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/auth/register') {
        return new Response(
          JSON.stringify({
            access_token: 'jwt-feynman-token',
            refresh_token: 'jwt-feynman-refresh',
            user: mockNewUser,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    });

    const handleClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={handleClose} />);

    // Switch to register
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    fireEvent.change(screen.getByPlaceholderText('Dr. Jane Doe'), {
      target: { value: 'Dr. Richard Feynman' },
    });
    fireEvent.change(screen.getByPlaceholderText('MIT / Computer Science'), {
      target: { value: 'Caltech' },
    });
    fireEvent.change(screen.getByPlaceholderText('researcher@university.edu'), {
      target: { value: 'feynman@caltech.edu' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'QuantumElectrodynamics2026!' },
    });

    const registerBtn = screen.getByRole('button', { name: /register/i });
    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(useResearchStore.getState().user?.full_name).toBe('Dr. Richard Feynman');
      expect(useResearchStore.getState().token).toBe('jwt-feynman-token');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays error banner when authentication fails', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/auth/login') {
        return new Response(
          JSON.stringify({ detail: 'Invalid academic credentials or unverified password' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    });

    render(<AuthModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('researcher@university.edu'), {
      target: { value: 'bad_user@domain.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'WrongPassword!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Invalid academic credentials or unverified password')
      ).toBeInTheDocument();
      expect(useResearchStore.getState().user).toBeNull();
    });
  });

  it('logout resets user and removes token from storage', () => {
    useResearchStore.getState().setUser(
      { id: 'usr-test', email: 'test@univ.edu' },
      'sample-jwt-token'
    );
    expect(useResearchStore.getState().user).not.toBeNull();
    expect(localStorage.getItem('rr_token')).toBe('sample-jwt-token');

    // Perform logout
    useResearchStore.getState().logout();

    expect(useResearchStore.getState().user).toBeNull();
    expect(useResearchStore.getState().token).toBeNull();
    expect(localStorage.getItem('rr_token')).toBeNull();
  });
});
