from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256
import base64

KEY_LENGTH = 2048

def generate_keys():
    """Generates a new RSA public/private key pair."""
    key = RSA.generate(KEY_LENGTH)
    private_key_pem = key.export_key().decode('utf-8')
    public_key_pem = key.publickey().export_key().decode('utf-8')
    return private_key_pem, public_key_pem

def sign_data(private_key_pem, data):
    """Signs data with a private key."""
    key = RSA.import_key(private_key_pem)
    h = SHA256.new(data)
    signature = pkcs1_15.new(key).sign(h)
    return base64.b64encode(signature).decode('utf-8')

def verify_signature(public_key_pem, data, signature):
    """Verifies a signature with a public key."""
    key = RSA.import_key(public_key_pem)
    h = SHA256.new(data)
    signature_bytes = base64.b64decode(signature)
    try:
        pkcs1_15.new(key).verify(h, signature_bytes)
        return True
    except (ValueError, TypeError):
        return False