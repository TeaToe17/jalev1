import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import time

import os
from dotenv import load_dotenv
load_dotenv()

def send_email(to_email, subject, message):
    from_email = "jale.official.contact@gmail.com"
    password = os.getenv("EMAIL_HOST_PASSWORD")  # Use app-specific password here
    
    # Set up the MIME
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(message, 'plain'))

    attempt = 3
    while attempt > 0:
        try:
            print(f"Trying to send email... ({4 - attempt} of 3 attempts)")
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(from_email, password)
                server.send_message(msg)
            print("Email sent successfully")
            break
        except Exception as e:
            print(f"Failed to send email: {e}")
            attempt -= 1
            if attempt > 0:
                print("Retrying in 2 seconds...")
                time.sleep(2)
            else:
                print("All retry attempts failed.")

