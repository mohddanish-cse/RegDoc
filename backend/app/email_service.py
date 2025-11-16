"""
Email Notification Service for RegDoc TMF System
Handles automated workflow notifications and document sharing
"""

import os
from threading import Thread
from flask import current_app
from flask_mail import Mail, Message
from datetime import datetime

# Initialize Flask-Mail (will be configured in __init__.py)
mail = Mail()

def send_async_email(app, msg):
    """Send email in background thread to avoid blocking"""
    with app.app_context():
        try:
            mail.send(msg)
            print(f"✅ Email sent successfully to {msg.recipients}")
        except Exception as e:
            print(f"❌ Email failed: {str(e)}")


def send_workflow_notification(recipient_email, recipient_name, document_info, workflow_type, sender_name):
    """
    Send email notification when document is assigned for workflow action
    """
    # Check if email is configured
    if not current_app.config.get('MAIL_USERNAME') or not current_app.config.get('MAIL_PASSWORD'):
        print("⚠️ Email not configured - skipping notification")
        return False
    
    try:
        # ✅ DEMO MODE: Route all emails to your email for viva demo
        demo_mode = current_app.config.get('DEMO_MODE', 'false').lower() == 'true'
        original_recipient = recipient_email
        
        if demo_mode:
            demo_email = current_app.config.get('DEMO_EMAIL')
            if demo_email:
                recipient_email = demo_email
                print(f"🎬 DEMO MODE: Routing email from {original_recipient} to {demo_email}")
        
        # Build email subject
        subject = f"Document Assigned for {workflow_type} - RegDoc TMF"
        
        # ✅ Show original recipient in email body for demo clarity
        demo_notice = ""
        if demo_mode:
            demo_notice = f"""
            <div style="background-color: #FEF3C7; padding: 15px; margin: 10px 0; border-left: 4px solid #F59E0B; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px;"><strong>🎬 Demo Mode Active</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 12px;">Original Recipient: <strong>{original_recipient}</strong></p>
            </div>
            """
        
        # Build HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
                .doc-info {{ background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4F46E5; }}
                .button {{ display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white !important; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                {demo_notice}
                <div class="header">
                    <h2>📄 Document Assigned for {workflow_type}</h2>
                </div>
                <div class="content">
                    <p>Hi <strong>{recipient_name}</strong>,</p>
                    <p>{sender_name} has assigned you a document for <strong>{workflow_type}</strong>.</p>
                    
                    <div class="doc-info">
                        <p><strong>📄 Document:</strong> {document_info.get('name', 'N/A')}</p>
                        <p><strong>📋 Current Status:</strong> {document_info.get('status', 'N/A')}</p>
                        <p><strong>🆔 Document ID:</strong> {document_info.get('id', 'N/A')}</p>
                        <p><strong>📅 Assigned Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                    </div>
                    
                    <p style="color: #333;">Please review the document at your earliest convenience.</p>
                    
                    <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:3000/')}" class="button">
                        View My Tasks
                    </a>
                    
                    <div class="footer">
                        <p>RegDoc TMF System - Document Management & Workflow</p>
                        <p>This is an automated notification. Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create email message
        msg = Message(
            subject=subject,
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[recipient_email],  # This will be demo email if demo mode is on
            html=html_body
        )
        
        # Send email in background thread (non-blocking)
        Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()
        
        print(f"📧 Email queued for {recipient_email} ({workflow_type})")
        return True
        
    except Exception as e:
        print(f"❌ Error preparing email: {str(e)}")
        return False


def send_share_notification(recipient_email, document_info, sender_name, custom_message=None):
    """
    Send email when approved document is shared
    
    Args:
        recipient_email (str): Email address of recipient
        document_info (dict): Document details
        sender_name (str): Name of person sharing
        custom_message (str, optional): Custom message from sender
    
    Returns:
        bool: True if email sent, False if disabled
    """
    # Check if email is configured
    if not current_app.config.get('MAIL_USERNAME') or not current_app.config.get('MAIL_PASSWORD'):
        print("⚠️ Email not configured - skipping share notification")
        return False
    
    try:
        subject = f"Document Shared with You - RegDoc TMF"
        
        custom_msg_html = ""
        if custom_message:
            custom_msg_html = f"""
            <div style="background-color: #FEF3C7; padding: 15px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <p><strong>Message from {sender_name}:</strong></p>
                <p style="font-style: italic;">"{custom_message}"</p>
            </div>
            """
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
                .doc-info {{ background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #10B981; }}
                .button {{ display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📤 Document Shared with You</h2>
                </div>
                <div class="content">
                    <p>Hi,</p>
                    <p><strong>{sender_name}</strong> has shared an approved document with you:</p>
                    
                    <div class="doc-info">
                        <p><strong>📄 Document:</strong> {document_info.get('name', 'N/A')}</p>
                        <p><strong>📋 Status:</strong> Approved</p>
                        <p><strong>🆔 Document ID:</strong> {document_info.get('id', 'N/A')}</p>
                        <p><strong>📅 Shared Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                    </div>
                    
                    {custom_msg_html}
                    
                    <p>You can view and download the document using the link below:</p>
                    
                    <a href="{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/documents/{document_info.get('id')}" class="button">
                        View Document
                    </a>
                    
                    <div class="footer">
                        <p>RegDoc TMF System - Document Management & Workflow</p>
                        <p>This is an automated notification. Please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = Message(
            subject=subject,
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[recipient_email],
            html=html_body
        )
        
        Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()
        
        print(f"📧 Share email queued for {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Error preparing share email: {str(e)}")
        return False
