package com.stegotext;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.Base64;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("=== StegoText Java Suite ===");
        System.out.println("1. Encrypt Text");
        System.out.println("2. Decrypt Text");
        System.out.println("3. Hide Text in Image (Encrypt + Embed)");
        System.out.println("4. Extract Text from Image (Extract + Decrypt)");
        System.out.print("Choose an option: ");
        
        String choice = scanner.nextLine();

        try {
            switch (choice) {
                case "1" -> {
                    System.out.print("Enter text to encrypt: ");
                    String text = scanner.nextLine();
                    System.out.print("Enter password: ");
                    char[] password = scanner.nextLine().toCharArray();

                    byte[] encrypted = CryptoEngine.encrypt(text, password);
                    String base64 = Base64.getEncoder().encodeToString(encrypted);
                    System.out.println("\nEncrypted Payload (Base64):");
                    System.out.println(base64);
                }
                case "2" -> {
                    System.out.print("Enter Base64 payload: ");
                    String base64 = scanner.nextLine();
                    System.out.print("Enter password: ");
                    char[] password = scanner.nextLine().toCharArray();

                    byte[] payload = Base64.getDecoder().decode(base64);
                    String decrypted = CryptoEngine.decrypt(payload, password);
                    System.out.println("\nDecrypted Text:");
                    System.out.println(decrypted);
                }
                case "3" -> {
                    System.out.print("Enter text to hide: ");
                    String text = scanner.nextLine();
                    System.out.print("Enter password: ");
                    char[] password = scanner.nextLine().toCharArray();
                    System.out.print("Enter source image path (PNG): ");
                    String imgPath = scanner.nextLine();
                    System.out.print("Enter output image path (PNG): ");
                    String outPath = scanner.nextLine();

                    byte[] payload = CryptoEngine.encrypt(text, password);
                    BufferedImage img = ImageIO.read(new File(imgPath));
                    BufferedImage stegoImg = StegoEngine.hide(img, payload);
                    
                    ImageIO.write(stegoImg, "png", new File(outPath));
                    System.out.println("\nSuccess! Message hidden in " + outPath);
                }
                case "4" -> {
                    System.out.print("Enter stego image path (PNG): ");
                    String imgPath = scanner.nextLine();
                    System.out.print("Enter password: ");
                    char[] password = scanner.nextLine().toCharArray();

                    BufferedImage img = ImageIO.read(new File(imgPath));
                    // We need to read the header to know the length. 
                    // Let's extract a reasonable chunk first or implement a header reader in StegoEngine.
                    // For simplicity, let's extract the first 11 bytes to get the length.
                    byte[] headerBytes = StegoEngine.extract(img, 11);
                    // Minimal logic to parse length from header (bytes 5-8)
                    int length = ((headerBytes[5] & 0xFF) << 24) | 
                                 ((headerBytes[6] & 0xFF) << 16) | 
                                 ((headerBytes[7] & 0xFF) << 8) | 
                                 (headerBytes[8] & 0xFF);
                    int saltLen = headerBytes[9] & 0xFF;
                    int ivLen = headerBytes[10] & 0xFF;
                    int totalPayloadLen = 11 + saltLen + ivLen + length;

                    byte[] fullPayload = StegoEngine.extract(img, totalPayloadLen);
                    String decrypted = CryptoEngine.decrypt(fullPayload, password);
                    System.out.println("\nDecrypted Text:");
                    System.out.println(decrypted);
                }
                default -> System.out.println("Invalid option.");
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        } finally {
            scanner.close();
        }
    }
}

