import logging
import sys
from typing import Optional

# Configure root logger format
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Dedicated loggers
logger = logging.getLogger("researchrabbit.app")
security_logger = logging.getLogger("researchrabbit.security")

def log_security_event(
    event_type: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    resource: Optional[str] = None,
    details: Optional[str] = None,
    severity: str = "INFO"
):
    """
    Standardized security audit logging for compliance and incident response.
    Logs: authentication events, authorization rejections (403), rate limit blocks (429),
    and malicious file upload attempts.
    """
    msg = f"SECURITY_EVENT: [{event_type}] | User: {user_id or 'anonymous'} | IP: {ip_address or 'unknown'} | Resource: {resource or 'N/A'}"
    if details:
        msg += f" | Details: {details}"

    if severity.upper() == "WARNING":
        security_logger.warning(msg)
    elif severity.upper() == "ERROR":
        security_logger.error(msg)
    else:
        security_logger.info(msg)
