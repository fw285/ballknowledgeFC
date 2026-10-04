# Draft Night FC: self-hosted setup

Your own copy of the game, on your own domain. Three free accounts plus an Anthropic API account (pay as you go). Allow about 30 minutes the first time.

| Piece | Service | Cost |
|---|---|---|
| The page + the Claude server function | Vercel (Hobby plan) | Free |
| Shared game state (keeps both devices in sync) | Firebase Firestore (Spark plan) | Free |
| Referee, ratings and commentary | Anthropic API | Pay per use, roughly $0.10–0.20 per game (estimate) |

Files in this folder:

- `index.html`: the game
- `api/claude.js`: the server function; it holds your API key, and the page never sees it
- `vercel.json`: gives the function up to 60 seconds for the match commentary
- `firestore.rules`: database rules you paste into Firebase

---

## Step 1: Firebase (game state)

1. Go to **console.firebase.google.com** and create a project (any name, e.g. `draft-night-fc`). You can turn Google Analytics off.
2. In the left menu open **Build → Firestore Database → Create database**. Pick a location near you (e.g. `us-east1`) and start in **production mode**.
3. Open the **Rules** tab, replace everything with the contents of `firestore.rules`, and press **Publish**.
4. Open **Project settings** (gear icon) → **General** → **Your apps**, click the web icon `</>`, and register an app. You don't need Firebase Hosting.
5. Firebase shows a `firebaseConfig` block. Open `index.html`, search for `SETUP`, and copy the six values into `FIREBASE_CONFIG`:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "draft-night-fc.firebaseapp.com",
  projectId: "draft-night-fc",
  storageBucket: "draft-night-fc.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

This config is meant to be public. Firebase web apps always ship it in the page; the rules from step 3 are what protect the data.

## Step 2: Anthropic API key

1. In the **Claude Console** (console.anthropic.com), create an account, add a payment method or credits, and **create an API key**. Copy it somewhere safe; it's shown only once.
2. **Set a monthly spend limit** there, for example $10. This is your safety net if anyone ever abuses the site.

The API is billed separately from a Claude.ai subscription. Details: docs.claude.com.

## Step 3: Put the files on GitHub

1. Create a free account at github.com if you don't have one, then create a **new repository** (private is fine).
2. On the empty repo page choose **uploading an existing file**, and drag in everything from this folder, including the `api` folder, so `api/claude.js` keeps its path. Commit.

## Step 4: Deploy on Vercel

1. Sign up at **vercel.com** with your GitHub account.
2. **Add New → Project**, and import your repository. Framework preset: **Other**. Leave build settings empty.
3. Before you press Deploy, open **Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key from step 2
   - `ACCESS_CODE` = a password you'll give your friend (e.g. `kickoff26`)
4. Press **Deploy**. You get a link like `draft-night-fc.vercel.app`. Open it and the lobby should load with no warning box.

To change anything later, edit the file on GitHub. Vercel redeploys automatically within a minute.

## Step 5: Your own domain (optional)

In Vercel: your project → **Settings → Domains** → add your domain, then follow the DNS records Vercel shows you at your domain registrar. HTTPS is set up automatically.

## Playing

Send your friend the link and the access code. Each of you enters a team name and the access code in the lobby. One of you presses **Create a game**, and the other presses **Join** on it in the list. No accounts, no permission prompts.

---

## Troubleshooting

| You see | Fix |
|---|---|
| "Setup isn't finished" | The Firebase config in `index.html` is still empty (step 1.5). |
| "The game database refused a save" | The rules from `firestore.rules` weren't published (step 1.3). |
| "The access code was wrong" | The code typed in the lobby doesn't match `ACCESS_CODE` in Vercel. After changing an environment variable, redeploy in Vercel. |
| Every pick says "No ruling" | Check Vercel → your project → **Logs** for the `/api/claude` function. Common causes: the API key is wrong, the account has no credits, or a model name changed. |
| No written commentary after the match | The commentary call took longer than 60 seconds or failed; the game falls back to its built-in commentary. |

### Cost control

- Referee rulings use Claude Haiku (fast and cheap). The pre-match dossier and commentary use Claude Sonnet.
- To make everything cheaper, add the environment variable `MODEL_DEFAULT` = `claude-haiku-4-5-20251001` in Vercel. The commentary gets a bit less colorful, and the cost per game drops a lot.
- The function also limits each visitor to 40 calls a minute, and rejects anyone without the access code.
