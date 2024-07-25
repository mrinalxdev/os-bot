# OS BOT

A program in pure typescript to help you understand and resolve an open source repository issue
it has been integrated with Google Gemini api

### How to use It ??

1. Clone the repository

2. ```bash
   cd os-bot
   ```

````

3. ```bash
    npm i
````

4. Create a `.env` file and get your Gemini API . Now its time for the github token, go to your github settings > Developer's Settings > Personal Access Tokens > Create a token for general use

Copy the token and paste it in the env file

5. Type in the repository owner and the repository of the issue ..

Go to index.ts file >>

```ts
  const issueNumber = ; // Change this to the issue number you want to analyze
```

6. ```bash
   npm start
   ```

Done !! Now you can use the issue analysis for raising a meaningful pr !!

created by (Mrinal)[https://mrinal-dev.vercel.app]
