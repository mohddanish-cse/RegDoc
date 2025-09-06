from Crypto.PublicKey import RSA

key = RSA.generate(2048)

# Generate keys in the recommended PKCS#8 format
private_key_pem = key.export_key(pkcs=8)
public_key_pem = key.publickey().export_key()

# Save private key to a file
with open('private_key.pem', 'wb') as f:
    f.write(private_key_pem)

# Save public key to a file
with open('public_key.pem', 'wb') as f:
    f.write(public_key_pem)

print("✅ Successfully saved 'private_key.pem' and 'public_key.pem' to your backend folder.")