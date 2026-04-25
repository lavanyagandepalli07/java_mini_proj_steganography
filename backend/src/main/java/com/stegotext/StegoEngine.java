package com.stegotext;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.BitSet;

/**
 * Implements Least Significant Bit (LSB) steganography for images.
 */
public final class StegoEngine {

    private StegoEngine() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * Hides a byte array into an image.
     *
     * @param inputImage The source image
     * @param data       The data to hide
     * @return A new image with the data hidden inside
     */
    public static BufferedImage hide(BufferedImage inputImage, byte[] data) {
        int width = inputImage.getWidth();
        int height = inputImage.getHeight();

        // Each pixel has 3 channels (RGB). We use 1 bit per channel.
        long totalBits = (long) width * height * 3;
        if (data.length * 8L > totalBits) {
            throw new IllegalArgumentException("Data too large for this image. Capacity: " + (totalBits / 8) + " bytes");
        }

        BufferedImage outputImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        BitSet bits = BitSet.valueOf(data);
        int bitIndex = 0;
        int dataBitCount = data.length * 8;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int rgb = inputImage.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                if (bitIndex < dataBitCount) {
                    r = (r & 0xFE) | (bits.get(bitIndex++) ? 1 : 0);
                }
                if (bitIndex < dataBitCount) {
                    g = (g & 0xFE) | (bits.get(bitIndex++) ? 1 : 0);
                }
                if (bitIndex < dataBitCount) {
                    b = (b & 0xFE) | (bits.get(bitIndex++) ? 1 : 0);
                }

                int newRgb = (r << 16) | (g << 8) | b;
                outputImage.setRGB(x, y, newRgb);
            }
        }

        return outputImage;
    }

    /**
     * Extracts data from an image.
     * Note: This implementation assumes you know the length of the data.
     * In the StegoText format, the length is embedded in the encrypted payload header.
     *
     * @param image      The image containing hidden data
     * @param dataLength The expected length of the data in bytes
     * @return The extracted byte array
     */
    public static byte[] extract(BufferedImage image, int dataLength) {
        int width = image.getWidth();
        int height = image.getHeight();
        int bitCount = dataLength * 8;
        BitSet bits = new BitSet(bitCount);
        int bitIndex = 0;

        for (int y = 0; y < height && bitIndex < bitCount; y++) {
            for (int x = 0; x < width && bitIndex < bitCount; x++) {
                int rgb = image.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                bits.set(bitIndex++, (r & 1) == 1);
                if (bitIndex < bitCount) bits.set(bitIndex++, (g & 1) == 1);
                if (bitIndex < bitCount) bits.set(bitIndex++, (b & 1) == 1);
            }
        }

        byte[] result = bits.toByteArray();
        if (result.length < dataLength) {
            byte[] padded = new byte[dataLength];
            System.arraycopy(result, 0, padded, 0, result.length);
            return padded;
        }
        return result;
    }
}
