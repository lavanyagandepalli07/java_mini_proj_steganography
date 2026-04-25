package com.stegotext;

import org.junit.jupiter.api.Test;
import java.security.GeneralSecurityException;
import static org.junit.jupiter.api.Assertions.*;

class CryptoEngineTest {

    @Test
    void testEncryptDecrypt() throws GeneralSecurityException {
        String originalText = "This is a secret message!";
        char[] password = "strong-password".toCharArray();

        byte[] payload = CryptoEngine.encrypt(originalText, password);
        assertNotNull(payload);
        assertTrue(payload.length > 32); // Header + Salt + IV + Ciphertext

        String decryptedText = CryptoEngine.decrypt(payload, password);
        assertEquals(originalText, decryptedText);
    }

    @Test
    void testDecryptWithWrongPassword() throws GeneralSecurityException {
        String originalText = "Secret";
        char[] password = "right-password".toCharArray();
        char[] wrongPassword = "wrong-password".toCharArray();

        byte[] payload = CryptoEngine.encrypt(originalText, password);

        // GCM decryption with wrong key/password should throw AEADBadTagException (wrapped in GeneralSecurityException)
        assertThrows(GeneralSecurityException.class, () -> {
            CryptoEngine.decrypt(payload, wrongPassword);
        });
    }

    @Test
    void testInvalidPayload() {
        char[] password = "password".toCharArray();
        byte[] invalidPayload = new byte[]{0, 0, 0, 0};

        assertThrows(IllegalArgumentException.class, () -> {
            CryptoEngine.decrypt(invalidPayload, password);
        });
    }

    @Test
    void testNullInputs() {
        assertThrows(NullPointerException.class, () -> {
            CryptoEngine.encrypt(null, "pass".toCharArray());
        });
        assertThrows(NullPointerException.class, () -> {
            CryptoEngine.encrypt("text", null);
        });
    }
}
