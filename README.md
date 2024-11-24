<div style="text-align: center">
  <img src="https://github.com/user-attachments/assets/97464e1f-e0e1-4eba-a2b9-64aeeec8c7a4" alt="favicon" width="30"> <h2>Secret Message - Anonymous Message Wall</h2>
  
</div>

Secret Message is a modern web application that allows users to create and manage anonymous message walls. Users can create both public and password-protected walls, share them with others, and receive anonymous messages.


💬 [Send Anonymous Message To Me](https://adelelawady.github.io/whisper-ink/#/send/e35432cc-0b61-441c-b13d-29fda226498f)

🔴 [Live Demo](https://adelelawady.github.io/whisper-ink/)

![screencapture-adelelawady-github-io-whisper-ink-2024-11-24-04_36_33](https://github.com/user-attachments/assets/d7ac64bd-6cea-454a-bc45-2f7b86787976)


![screencapture-adelelawady-github-io-whisper-ink-2024-11-24-04_37_33](https://github.com/user-attachments/assets/0cb9ebf4-4b5f-4588-95e0-34d322e48959)



## Features

- 🔒 Create public or password-protected message walls
- 📝 Send anonymous messages to any wall
- 💬 Comment on messages (for authenticated users)
- 🎨 Beautiful and responsive UI
- 👤 User authentication
- 🌙 Modern avatar system
- 📱 Mobile-friendly design

## Tech Stack

- **Frontend:**
  - React
  - TypeScript
  - Tailwind CSS
  - shadcn/ui
  - React Query

- **Backend:**
  - Supabase (Authentication, Database)

## Getting Started

1. Clone the repository:
```
git clone https://github.com/yourusername/secret-message.git
cd secret-message
```


2. Install dependencies:
```
npm install
```



3. Set up environment variables:
Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```



4. Run the development server:


```
npm run dev
```



## Usage

1. **Create a Wall:**
   - Sign in to your account
   - Click "Create New Wall"
   - Set a title and optional password

2. **Share Your Wall:**
   - Copy the wall's share link
   - Send it to friends

3. **Receive Messages:**
   - Anyone with the link can send anonymous messages
   - If the wall is password-protected, viewers need the password

4. **Manage Messages:**
   - View all messages on your walls
   - Authenticated users can comment on messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, please open an issue in the repository.
