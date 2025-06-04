Note: This Project was initially named PeerPC, so you may find that name in some of the places, which you can ignore.

**HexDrop project structure and logic:**

1. **Project Overview**:
   - This is a Next.js application built with TypeScript for peer-to-peer file sharing
   - It uses modern web technologies and follows a full-stack architecture

2. **Main Technologies**:
   - Frontend: Next.js 15.3.3 with React 19
   - Database: PostgreSQL with Prisma ORM
   - File Storage: AWS S3
   - Authentication: NextAuth.js
   - Real-time Communication: Socket.io and Pusher
   - Styling: Tailwind CSS with custom components

3. **Application Structure**:
   - `/src/app`: Main application routes
     - `/send`: File sending interface
     - `/receive`: File receiving interface
     - `/api`: Backend API endpoints
   - `/src/components`: Reusable UI components
   - `/src/lib`: Utility functions and shared logic
   - `/src/types`: TypeScript type definitions
   - `/src/generated`: Auto-generated code (including Prisma client)

4. **Database Schema**:
   The application uses a `FileTransfer` model with the following fields:
   - `id`: Unique identifier (CUID)
   - `uniqueKey`: Unique key for file transfer
   - `fileName`: Name of the transferred file
   - `fileSize`: Size of the file
   - `mimeType`: File type
   - `s3Key`: AWS S3 storage key
   - `encryptionIV`: Initialization vector for encryption
   - `authTag`: Authentication tag for encryption
   - `createdAt`: Timestamp of creation
   - `expiresAt`: Expiration timestamp
   - `downloadCount`: Number of times downloaded
   - `maxDownloads`: Maximum allowed downloads
   - `password`: Optional password protection

5. **Key Features**:
   - Secure file transfer with encryption
   - Password protection for files
   - Download limit controls
   - File expiration
   - Real-time progress tracking
   - AWS S3 integration for file storage
   - Modern UI with Tailwind CSS

## Screenshots

### 1. Upload a file
./public/screenshots/1-upload.png

### 2. Share the key
./public/screenshots/2-key.png

### 3. Download the file
./public/screenshots/3-download.png

6. **Security Features**:
   - File encryption using IV and auth tags
   - Password protection option
   - Download count tracking
   - File expiration system

7. **Development Setup**:
   - Uses Turbopack for faster development
   - ESLint for code linting
   - TypeScript for type safety
   - Environment variables for configuration

Let me check the main page component to understand the user interface better.


Read file: src/app/page.tsx

8. **User Interface**:
   The main page (`page.tsx`) implements a clean, modern interface with two main sections:

   a) **Send Section**:
   - File selection button
   - Upload button
   - Progress tracking
   - Generated key display for sharing
   - Error handling and validation

   b) **Receive Section**:
   - 6-digit key input field
   - Download button
   - Progress tracking
   - Error handling and validation

9. **File Transfer Flow**:
   - **Sending**:
     1. User selects a file
     2. File is uploaded to the server
     3. Server generates a unique 6-digit key
     4. File is stored in S3 with encryption
     5. Key is displayed to the sender for sharing

   - **Receiving**:
     1. User enters the 6-digit key
     2. System validates the key
     3. File is downloaded from S3
     4. File is decrypted
     5. Download is tracked and counted

10. **Security Measures**:
    - Files are encrypted before storage
    - 6-digit key system for secure sharing
    - Download count tracking
    - File expiration system
    - Optional password protection

This is a well-structured application that provides a secure and user-friendly way to share files between devices. The use of modern technologies and security practices makes it a robust solution for peer-to-peer file sharing.

