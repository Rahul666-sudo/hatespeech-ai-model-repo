# HateGuard AI — Hate Speech Detection

HateGuard AI is a web-based application designed to identify hate speech, offensive language, and safe content in text. It provides users with a simple interface to analyze text and understand its classification using AI-powered language analysis.

## ATTENTION

Rename the .env.example to .env before you run the the build!!!!!

## Features

- **Text Analysis:** Enter text and analyze its content.
- **Content Classification:** Classifies text into categories such as hate speech, offensive language, or safe content.
- **AI-Powered Analysis:** Uses a backend AI service to process and classify submitted text.
- **User Authentication:** Supports account-related features through Supabase.
- **Chat Interface:** Provides an interactive chat interface with backend integration.
- **Responsive Design:** Offers a user-friendly interface across different screen sizes.

## Technologies Used

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components

### Backend and Services
- Supabase
- Supabase Edge Functions
- Lovable AI Gateway for AI-powered text classification
- PostgreSQL-related database tooling

### Development Tools
- Visual Studio Code
- Node.js
- npm
- Git and GitHub

## Project Structure

```text
hateguardai/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── chat/           # Chat-related components
│   │   └── ui/             # UI component library
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Supabase integration
│   ├── lib/                # Utility functions
│   ├── pages/              # Application pages
│   ├── App.tsx             # Application routing and providers
│   ├── App.css             # Application styles
│   ├── index.css           # Global styles
│   └── main.tsx            # Application entry point
├── supabase/
│   └── functions/
│       ├── analyze-speech/ # Text analysis endpoint
│       └── send-message/   # Chat/message endpoint
├── drizzle/                # Database schema and migrations
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── package-lock.json       # npm dependency lockfile
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Example environment configuration
└── README.md               # Project documentation
```

## Prerequisites

Before running the project, install:

- [Node.js](https://nodejs.org/) — preferably an appropriate LTS version
- npm, included with Node.js
- [Visual Studio Code](https://code.visualstudio.com/) or another code editor

Access to the configured Supabase project and AI service is required for backend-dependent features.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Rahul666-sudo/hateguardai.git
cd hateguardai
```

Alternatively, download the repository as a ZIP file and extract it.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and configure the variables required by the application.

Example frontend configuration:

```dotenv
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

Use the correct values from your Supabase project. The example values above are placeholders.

**Security note:** Never commit private API keys, database passwords, Supabase service-role keys, or other server-side secrets to GitHub. Variables prefixed with `VITE_` are exposed to the frontend and must not contain private credentials.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually:

```text
http://localhost:8080/
```

The port may differ depending on the local configuration.

## Building for Production

To create a production build, run:

```bash
npm run build
```

The generated frontend files are normally placed in the `dist/` directory.

To preview the production build locally, run:

```bash
npm run preview
```

Vite will display the local preview URL in the terminal.

## Backend Configuration

HateGuard AI uses Supabase Edge Functions for backend operations.

The project includes:

- `analyze-speech` — handles text classification requests.
- `send-message` — supports chat and message-related functionality.

These functions must be deployed to the appropriate Supabase project and configured with the required server-side secrets.

The current AI integration uses the Lovable AI Gateway. The required `LOVABLE_API_KEY` must be configured securely for the backend functions. Running the frontend locally does not automatically deploy these functions or configure their secrets.

Refer to the [Supabase documentation](https://supabase.com/docs) for deployment and configuration instructions.

## Deployment

The frontend can be deployed to a hosting provider that supports React and Vite, such as:

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)

Typical build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Configure the required frontend environment variables in the hosting provider. Backend functions and their secrets must be configured separately in Supabase.

## Testing

Before presenting the project, verify that:

- The homepage loads correctly.
- Navigation works as expected.
- Text analysis returns a result.
- Authentication works when configured.
- Chat and message functionality work.
- The production build completes successfully.

A successful frontend build does not by itself guarantee that external services and backend functions are working.

## Limitations

- Classification results depend on the configured AI service and its model.
- Automated classifications may be incorrect or miss context, sarcasm, or nuanced language.
- Results should be treated as assistance for reviewing text, not as definitive judgments.
- Backend features require valid service configuration and network access.

## Future Enhancements

Possible improvements include:

- Integration with a custom-trained hate speech detection model.
- More detailed classification results and explanations.
- Improved evaluation using labeled datasets and standard performance metrics.
- Support for additional languages.
- Enhanced moderation tools and reporting features.

## License

No license has been specified for this project yet. Add a license file if you intend to distribute the code under particular reuse conditions.

## Acknowledgements

This project uses open-source technologies including React, TypeScript, Vite, Tailwind CSS, and Supabase, along with the configured AI service for text analysis.
