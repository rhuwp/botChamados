const venom = require('venom-bot');

venom
  .create({
    session: 'bot-session', 
    multidevice: true, 
    headless: true, 
    logQR: true, 
    folderNameToken: 'tokens', 
  })
  .then(client => start(client))
  .catch(err => console.log("Erro ao iniciar o bot:", err));

  function start(client) {
    client.onMessage(async message => {
      const chatId = message.from;
      console.log(`📩 Mensagem recebida de ${chatId}: ${message.body}`);
  
      if (message.body.toLowerCase() === 'oi' || message.body.toLowerCase() === 'menu') {
        console.log("📨 Enviando menu de opções...");
  
        await client.sendText(chatId, 'Olá, eu sou um bot de exemplo. Como posso te ajudar?');
        await client.sendText(chatId, '1️⃣ - Opção 1');
        await client.sendText(chatId, '2️⃣ - Opção 2');
        await client.sendText(chatId, '3️⃣ - Opção 3');
        await client.sendText(chatId, 'Digite "menu" a qualquer momento para exibir este menu novamente.');
      }
      
        if (message.body === '1') {
            console.log("📨 Enviando resposta da opção 1...");
    
            await client.sendText(chatId, 'Você escolheu a opção 1.');
        }
        if (message.body === '2') {
            console.log("📨 Enviando resposta da opção 2...");
    
            await client.sendText(chatId, 'Você escolheu a opção 2.');
        }
        if (message.body === '3') {
            console.log("📨 Enviando resposta da opção 3...");
    
            await client.sendText(chatId, 'Você escolheu a opção 3.');
        }
        if (message.body === 'menu') {
            console.log("📨 Enviando menu de opções...");
    
            await client.sendText(chatId, '1️⃣ - Opção 1');
            await client.sendText(chatId, '2️⃣ - Opção 2');
            await client.sendText(chatId, '3️⃣ - Opção 3');
            await client.sendText(chatId, 'Digite "menu" a qualquer momento para exibir este menu novamente.');
        }

    });
  }
