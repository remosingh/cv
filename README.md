# Agentic City - AI Agent Coordination Platform

A unique AI agent platform that visualizes agent coordination as a living, SimCity-style isometric city. Users interact with a central coordination agent that spawns specialized agents to complete research, writing, editing, and analysis tasks.

## Features

### Beta Release (Current)
- **Isometric City Visualization**: SimCity-style view with buildings representing agents
- **Central Coordination Agent**: Hub that coordinates all agent activities
- **Specialized Agents**: Research, Writing, Editing, and Analysis agents
- **Document Management**: Create, edit, and download text documents
- **Real-time Information Flow**: Visual indicators showing agent communication
- **Firebase Integration**: Persistent data storage and authentication
- **Claude AI Integration**: Powered by Anthropic's Claude API

### Architecture
- **Hub-and-Spoke Model**: All agents communicate through the coordinator
- **React Frontend**: Modern, responsive UI
- **Phaser 3**: Isometric game engine for city visualization
- **Firebase**: Authentication, Firestore database, and hosting
- **Claude API**: AI-powered agent intelligence

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Anthropic Claude API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cv
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**

   a. Create a new project at [Firebase Console](https://console.firebase.google.com/)

   b. Enable Authentication:
      - Go to Authentication → Sign-in method
      - Enable Email/Password and Google sign-in

   c. Create Firestore Database:
      - Go to Firestore Database → Create database
      - Start in production mode
      - Choose your preferred region

   d. Get your Firebase configuration:
      - Go to Project Settings → General
      - Scroll to "Your apps" and create a web app
      - Copy the configuration object

4. **Configure environment variables**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id

   REACT_APP_CLAUDE_API_KEY=your_claude_api_key
   REACT_APP_CLAUDE_API_URL=https://api.anthropic.com/v1/messages
   ```

5. **Deploy Firestore security rules**

   Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

   Login and initialize:
   ```bash
   firebase login
   firebase init
   ```
   Select Firestore and Hosting, then deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **Start the development server**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## Usage

### First Time Setup
1. Sign up with email/password or Google
2. You'll see the isometric city view with the Coordination Office at the center

### Working with Agents

#### Sending Tasks
- Type your task in the chat interface
- The coordinator analyzes your request
- Specialized agents are spawned as needed
- Watch the city as new "buildings" appear for each agent
- Information flows are visualized as animated particles between buildings

#### Example Tasks
```
"Research the history of artificial intelligence"
→ Spawns a Research Agent

"Write a formal letter of recommendation for John Smith"
→ Spawns a Writer Agent

"Analyze the pros and cons of remote work"
→ Spawns an Analyst Agent

"Review and improve this document"
→ Spawns an Editor Agent
```

### Viewing Documents
1. Click the "Documents" tab in the header
2. Browse documents created by agents
3. Click a document to view its contents
4. Download documents as text files
5. Delete documents you no longer need

### Agent Interaction
- Click on any building in the city to focus on that agent
- The task interface updates to show that agent's information
- All communication still routes through the coordinator

## Project Structure

```
cv/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js/css          # Authentication UI
│   │   ├── Dashboard.js/css      # Main application container
│   │   ├── CityView.js/css       # Phaser city integration
│   │   ├── TaskInterface.js/css  # Chat/task interface
│   │   └── DocumentViewer.js/css # Document management
│   ├── contexts/
│   │   └── AuthContext.js        # Firebase auth context
│   ├── phaser/
│   │   └── CityScene.js          # Phaser 3 isometric scene
│   ├── services/
│   │   ├── firebase.js           # Firebase initialization
│   │   ├── claudeAPI.js          # Claude API integration
│   │   ├── agentService.js       # Agent management
│   │   └── documentService.js    # Document operations
│   ├── App.js                    # Root component
│   └── index.js                  # Entry point
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore indexes
├── firebase.json                 # Firebase configuration
├── package.json                  # Dependencies
└── .env.example                  # Environment template
```

## Agent Types

### Coordinator Agent (Default)
- Central hub for all communication
- Analyzes user requests
- Delegates tasks to specialized agents
- Synthesizes results from multiple agents
- Located at the center of the city (blue building)

### Researcher Agent
- Gathers information on specific topics
- Finds facts, data, and relevant details
- Provides structured research results
- Purple building in the city

### Writer Agent
- Creates well-written documents
- Drafts letters, reports, articles
- Maintains appropriate tone and style
- Red building in the city

### Editor Agent
- Reviews and improves documents
- Checks grammar, clarity, coherence
- Suggests improvements
- Gold building in the city

### Analyst Agent
- Analyzes data and information
- Identifies patterns and insights
- Provides recommendations
- Teal building in the city

## Development

### Available Scripts

- `npm start` - Run development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

### Deploying to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Security

### Firestore Rules
The application uses security rules to ensure:
- Users can only access their own agents
- Users can only access their own documents
- All operations require authentication

### API Keys
- Never commit `.env` file to version control
- Keep your Claude API key secure
- Monitor API usage for unexpected charges

## Future Enhancements

### Planned Features
- Agent-to-agent direct communication
- More document types (spreadsheets, presentations)
- Advanced agent behaviors and specializations
- Team collaboration features
- Mobile app version
- Voice interaction
- Integration with external services (email, calendar, etc.)
- Advanced task scheduling and automation
- Visual task dependencies and workflows

## Troubleshooting

### Common Issues

**"Claude API key not configured"**
- Check that your `.env` file exists
- Verify `REACT_APP_CLAUDE_API_KEY` is set correctly
- Restart the development server after changing `.env`

**Firebase authentication errors**
- Verify Firebase credentials in `.env`
- Check that Authentication is enabled in Firebase Console
- Ensure your domain is authorized in Firebase settings

**Agents not appearing in the city**
- Check browser console for errors
- Verify Firestore rules are deployed
- Ensure user is authenticated

**Performance issues**
- Too many agents may slow down the visualization
- Consider clearing old agents periodically
- Check network tab for slow API calls

## API Usage and Costs

### Claude API
- The application uses Claude 3.5 Sonnet model
- Each message consumes API tokens
- Monitor usage in your Anthropic account
- Consider implementing rate limiting for production

### Firebase
- Free tier includes:
  - 50K reads/day
  - 20K writes/day
  - 1GB storage
- Monitor usage in Firebase Console

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: This README
- Firebase Docs: https://firebase.google.com/docs
- Anthropic Docs: https://docs.anthropic.com

## Acknowledgments

- Built with React and Phaser 3
- Powered by Claude AI (Anthropic)
- Backend by Firebase
- Inspired by SimCity's isometric visualization

---

**Note**: This is a beta release. Features and APIs may change as the platform evolves.
