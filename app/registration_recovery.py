"""Email delivery abstraction for registration-link recovery."""

import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage

from flask import current_app


class RegistrationRecoveryMailer(ABC):
    @abstractmethod
    def send_tracking_link(self, email: str, event_title: str, tracking_url: str) -> bool:
        """Deliver a private tracking link without returning it to the caller."""


class NullRegistrationRecoveryMailer(RegistrationRecoveryMailer):
    def send_tracking_link(self, email: str, event_title: str, tracking_url: str) -> bool:
        return False


class SmtpRegistrationRecoveryMailer(RegistrationRecoveryMailer):
    def send_tracking_link(self, email: str, event_title: str, tracking_url: str) -> bool:
        message = EmailMessage()
        message["Subject"] = f"Your registration link for {event_title}"
        message["From"] = current_app.config["MAIL_FROM"]
        message["To"] = email
        message.set_content(
            "Use this private link to view your INCAS registration status:\n\n"
            f"{tracking_url}\n\n"
            "If you did not request this message, you can ignore it."
        )
        host = current_app.config["SMTP_HOST"]
        port = int(current_app.config.get("SMTP_PORT", 587))
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            if current_app.config.get("SMTP_STARTTLS", True):
                smtp.starttls()
            username = current_app.config.get("SMTP_USERNAME", "")
            if username:
                smtp.login(username, current_app.config.get("SMTP_PASSWORD", ""))
            smtp.send_message(message)
        return True


def get_registration_recovery_mailer() -> RegistrationRecoveryMailer:
    if current_app.config.get("SMTP_HOST") and current_app.config.get("MAIL_FROM"):
        return SmtpRegistrationRecoveryMailer()
    return NullRegistrationRecoveryMailer()
