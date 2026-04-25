package com.stegotext;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Objects;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * A reference implementation of the cryptographic engine used in StegoText.
 * Implements PBKDF2 for key derivation and AES-GCM for authenticated encryption.
 */
public final class CryptoEngine {
    private static final int MAGIC_NUMBER = 0x53544547; // "STEG"
    private static final byte VERSION = 0x01;
    private static final int SALT_LENGTH = 16;
    private static final int IV_LENGTH = 12;
    private static final int KEY_LENGTH_BITS = 256;
    private static final int PBKDF2_ITERATIONS = 200_000;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private static final SecureRandom RANDOM = new SecureRandom();

    private CryptoEngine() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * Encrypts a plaintext string using a password.
     *
     * @param plaintext The text to encrypt
     * @param password  The password for encryption
     * @return The binary payload containing magic, version, salt, IV, and ciphertext
     * @throws GeneralSecurityException if encryption fails
     */
    public static byte[] encrypt(String plaintext, char[] password) throws GeneralSecurityException {
        Objects.requireNonNull(plaintext, "Plaintext must not be null");
        Objects.requireNonNull(password, "Password must not be null");
        if (password.length == 0) {
            throw new IllegalArgumentException("Password must not be empty");
        }

        byte[] salt = randomBytes(SALT_LENGTH);
        SecretKey key = deriveKey(password, salt);

        byte[] iv = randomBytes(IV_LENGTH);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);

        byte[] plaintextBytes = plaintext.getBytes(StandardCharsets.UTF_8);
        byte[] ciphertext = cipher.doFinal(plaintextBytes);

        return encodePayload(salt, iv, ciphertext);
    }

    /**
     * Decrypts a binary payload using a password.
     *
     * @param payload  The binary payload to decrypt
     * @param password The password for decryption
     * @return The decrypted plaintext
     * @throws GeneralSecurityException if decryption or authentication fails
     */
    public static String decrypt(byte[] payload, char[] password) throws GeneralSecurityException {
        Objects.requireNonNull(payload, "Payload must not be null");
        Objects.requireNonNull(password, "Password must not be null");
        if (payload.length == 0) {
            throw new IllegalArgumentException("Payload must not be empty");
        }
        if (password.length == 0) {
            throw new IllegalArgumentException("Password must not be empty");
        }

        PayloadHeader header = decodePayload(payload);
        SecretKey key = deriveKey(password, header.salt());

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, header.iv());
        cipher.init(Cipher.DECRYPT_MODE, key, spec);

        byte[] plaintextBytes = cipher.doFinal(header.ciphertext());
        return new String(plaintextBytes, StandardCharsets.UTF_8);
    }

    private static byte[] randomBytes(int size) {
        byte[] buffer = new byte[size];
        RANDOM.nextBytes(buffer);
        return buffer;
    }

    private static SecretKey deriveKey(char[] password, byte[] salt) throws GeneralSecurityException {
        PBEKeySpec spec = new PBEKeySpec(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        byte[] rawKey = factory.generateSecret(spec).getEncoded();
        return new SecretKeySpec(rawKey, "AES");
    }

    private static byte[] encodePayload(byte[] salt, byte[] iv, byte[] ciphertext) {
        // Format: MAGIC(4) + VERSION(1) + LENGTH(4) + SALT_LEN(1) + IV_LEN(1) + SALT + IV + CIPHERTEXT
        int size = 4 + 1 + 4 + 1 + 1 + salt.length + iv.length + ciphertext.length;
        ByteBuffer buffer = ByteBuffer.allocate(size);
        buffer.putInt(MAGIC_NUMBER);
        buffer.put(VERSION);
        buffer.putInt(ciphertext.length);
        buffer.put((byte) salt.length);
        buffer.put((byte) iv.length);
        buffer.put(salt);
        buffer.put(iv);
        buffer.put(ciphertext);
        return buffer.array();
    }

    private static PayloadHeader decodePayload(byte[] payload) {
        if (payload.length < 11) { // Min header size: 4+1+4+1+1
            throw new IllegalArgumentException("Payload too short");
        }
        ByteBuffer buffer = ByteBuffer.wrap(payload);
        int magic = buffer.getInt();
        if (magic != MAGIC_NUMBER) {
            throw new IllegalArgumentException("Invalid payload header (Magic number mismatch)");
        }
        byte version = buffer.get();
        if (version != VERSION) {
            throw new IllegalArgumentException("Unsupported payload version: " + version);
        }
        int ciphertextLength = buffer.getInt();
        int saltLen = Byte.toUnsignedInt(buffer.get());
        int ivLen = Byte.toUnsignedInt(buffer.get());

        int expectedLength = 11 + saltLen + ivLen + ciphertextLength;
        if (payload.length != expectedLength) {
            throw new IllegalArgumentException("Payload length mismatch: expected " + expectedLength + ", got " + payload.length);
        }

        byte[] salt = new byte[saltLen];
        byte[] iv = new byte[ivLen];
        byte[] ciphertext = new byte[ciphertextLength];
        buffer.get(salt);
        buffer.get(iv);
        buffer.get(ciphertext);

        return new PayloadHeader(salt, iv, ciphertext);
    }

    /**
     * Internal representation of the decrypted payload components.
     */
    private record PayloadHeader(byte[] salt, byte[] iv, byte[] ciphertext) {
    }
}

