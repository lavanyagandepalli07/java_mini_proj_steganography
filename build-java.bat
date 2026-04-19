@echo off
cd java
javac com\stegotext\CryptoEngine.java
if errorlevel 1 (
  echo Java compilation failed.
  exit /b 1
)
echo Java crypto module compiled successfully.
