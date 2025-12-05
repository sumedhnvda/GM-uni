from twilio.rest import Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class SmsService:
    def __init__(self):
        self.client = None
        print(f"SMS Service Init: TWILIO_ACCOUNT_SID = {settings.TWILIO_ACCOUNT_SID[:10]}..." if settings.TWILIO_ACCOUNT_SID else "SMS Service Init: No TWILIO_ACCOUNT_SID")
        print(f"SMS Service Init: TWILIO_AUTH_TOKEN = {settings.TWILIO_AUTH_TOKEN[:10]}..." if settings.TWILIO_AUTH_TOKEN else "SMS Service Init: No TWILIO_AUTH_TOKEN")
        print(f"SMS Service Init: TWILIO_MESSAGING_SERVICE_SID = {settings.TWILIO_MESSAGING_SERVICE_SID}" if settings.TWILIO_MESSAGING_SERVICE_SID else "SMS Service Init: No TWILIO_MESSAGING_SERVICE_SID")
        
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                print("SMS Service Init: Twilio client initialized successfully!")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                print(f"SMS Service Init: FAILED to initialize Twilio client: {e}")

    def send_sms(self, to: str, body: str) -> bool:
        """Send an SMS to the specified number."""
        print("=" * 60)
        print(f"SMS SEND REQUEST")
        print(f"  To: {to}")
        print(f"  Body Length: {len(body)} chars")
        print(f"  Body Preview: {body[:100]}...")
        print(f"  Client Ready: {self.client is not None}")
        print("=" * 60)
        
        if not self.client:
            logger.warning("Twilio client not initialized. Skipping SMS.")
            print("SMS RESULT: FAILED - Twilio client not initialized!")
            return False
        
        try:
            print(f"Calling Twilio API with Messaging Service SID: {settings.TWILIO_MESSAGING_SERVICE_SID}")
            message = self.client.messages.create(
                messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
                body=body,
                to=to
            )
            
            # Log full message details
            print(f"SMS RESULT: SUCCESS!")
            print(f"  Message SID: {message.sid}")
            print(f"  Status: {message.status}")
            print(f"  Date Created: {message.date_created}")
            print(f"  Direction: {message.direction}")
            print(f"  From: {message.from_}")
            print(f"  To: {message.to}")
            print(f"  Price: {message.price}")
            print(f"  Error Code: {message.error_code}")
            print(f"  Error Message: {message.error_message}")
            print("=" * 60)
            
            logger.info(f"SMS sent to {to}: {message.sid} - Status: {message.status}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {to}: {e}")
            print(f"SMS RESULT: FAILED!")
            print(f"  Error Type: {type(e).__name__}")
            print(f"  Error: {e}")
            print("=" * 60)
            return False

sms_service = SmsService()
