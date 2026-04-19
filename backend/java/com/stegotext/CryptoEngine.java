package com.stegotext;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

public final class CryptoEngine {
    private static final int SALT_LENGTH = 16;
    private static final int IV_LENGTH = 12;
    private static final int KEY_LENGTH_BITS = 256;
    private static final int PBKDF2_ITERATIONS = 200_000;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private CryptoEngine() {
    }

    public static byte[] encrypt(String plaintext, char[] password) throws GeneralSecurityException {
        if (plaintext == null) {
            throw new IllegalArgumentException("Plaintext must not be null");
        }
        if (password == null || password.length == 0) {
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

    public static String decrypt(byte[] payload, char[] password) throws GeneralSecurityException {
        if (payload == null || payload.length == 0) {
            throw new IllegalArgumentException("Payload must not be empty");
        }
        if (password == null || password.length == 0) {
            throw new IllegalArgumentException("Password must not be empty");
        }

        PayloadHeader header = decodePayload(payload);
        SecretKey key = deriveKey(password, header.salt);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, header.iv);
        cipher.init(Cipher.DECRYPT_MODE, key, spec);

        byte[] plaintextBytes = cipher.doFinal(header.ciphertext);
        return new String(plaintextBytes, StandardCharsets.UTF_8);
    }

    private static byte[] randomBytes(int size) {
        byte[] buffer = new byte[size];
        new SecureRandom().nextBytes(buffer);
        return buffer;
    }

    private static SecretKey deriveKey(char[] password, byte[] salt) throws GeneralSecurityException {
        PBEKeySpec spec = new PBEKeySpec(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        byte[] rawKey = factory.generateSecret(spec).getEncoded();
        return new SecretKeySpec(rawKey, "AES");
    }

    private static byte[] encodePayload(byte[] salt, byte[] iv, byte[] ciphertext) {
        ByteBuffer buffer = ByteBuffer.allocate(4 + 1 + 4 + 1 + 1 + salt.length + iv.length + ciphertext.length);
        buffer.putInt(0x53544547);
        buffer.put((byte) 0x01);
        buffer.putInt(ciphertext.length);
        buffer.put((byte) salt.length);
        buffer.put((byte) iv.length);
        buffer.put(salt);
        buffer.put(iv);
        buffer.put(ciphertext);
        return buffer.array();
    }

    private static PayloadHeader decodePayload(byte[] payload) {
        if (payload.length < 4 + 1 + 4 + 1 + 1) {
            throw new IllegalArgumentException("Payload too short");
        }
        ByteBuffer buffer = ByteBuffer.wrap(payload);
        int magic = buffer.getInt();
        if (magic != 0x53544547) {
            throw new IllegalArgumentException("Invalid payload header");
        }
        byte version = buffer.get();
        if (version != 0x01) {
            throw new IllegalArgumentException("Unsupported payload version");
        }
        int ciphertextLength = buffer.getInt();
        int saltLen = Byte.toUnsignedInt(buffer.get());
        int ivLen = Byte.toUnsignedInt(buffer.get());

        int expectedLength = 4 + 1 + 4 + 1 + 1 + saltLen + ivLen + ciphertextLength;
        if (payload.length != expectedLength) {
            throw new IllegalArgumentException("Payload length mismatch");
        }
        byte[] salt = new byte[saltLen];
        byte[] iv = new byte[ivLen];
        byte[] ciphertext = new byte[ciphertextLength];
        buffer.get(salt);
        buffer.get(iv);
        buffer.get(ciphertext);
        return new PayloadHeader(salt, iv, ciphertext);
    }

    private static final class PayloadHeader {
        final byte[] salt;
        final byte[] iv;
        final byte[] ciphertext;

        PayloadHeader(byte[] salt, byte[] iv, byte[] ciphertext) {
            this.salt = salt;
            this.iv = iv;
            this.ciphertext = ciphertext;
        }
    }
}
