const venom = require('venom-bot');
const fs = require('fs'); 
const path = require('path'); 

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
  const tecnicosNumeros = ['XXXXXXX@c.us','XXXXXXXXX@c.us']; // Lista de números dos técnicos
  const numerosExcecao = ['XXXXXXXX','XXXXXXXXXXX@c.us','']; // Lista de números que o bot deve ignorar
  const userStates = {}; // Objeto para rastrear o estado de cada usuário
  const chamados = []; // Array para armazenar os chamados
  const conversaDireta = {};
  

  
  client.onMessage(async message => {
    const chatId = message.from;
  
    // Verifica se o número está na lista de exceções
    if (numerosExcecao.includes(chatId)) {
      console.log(`Mensagem ignorada do número ${chatId}.`);
      return;
    }

    
    
  








  
    // Verifica se o modo de conversa direta está ativo
    if (conversaDireta[chatId]) {
      const tecnicoId = conversaDireta[chatId];
  
      // Permite que o técnico envie o comando "!sair" para desativar o modo de conversa direta
      if (tecnicosNumeros.includes(chatId) && message.body.toLowerCase().trim() === '!sair') {
        const usuarioId = conversaDireta[chatId];
        if (usuarioId) {
          delete conversaDireta[usuarioId];
          delete conversaDireta[chatId];
          await client.sendText(chatId, 'Modo de conversa direta desativado.');
          await client.sendText(usuarioId, 'O modo de conversa direta foi desativado pelo técnico.');
          console.log(`Modo de conversa direta desativado entre técnico ${chatId} e usuário ${usuarioId}.`);
        } else {
          await client.sendText(chatId, 'Nenhuma conversa direta está ativa para ser desativada.');
          console.log(`Nenhuma conversa direta ativa para o técnico ${chatId}.`);
        }
        return;
      }
  
      const tecnicosNomes = {
        'XXXXXXXXXX@c.us': 'Rhuan',
        'XXXXXXXXXX@c.us': 'Léo'
      };

     
      
     
      










      // Fluxo normal do modo de conversa direta
      if (tecnicosNumeros.includes(chatId)) {
        const match = message.body.match(/^send (.+)$/i);
        if (match) {
          const mensagem = match[1];
          const usuarioId = conversaDireta[chatId];
          if (usuarioId) {
            const tecnicoNome = tecnicosNomes[chatId] || 'Técnico';
            await client.sendText(usuarioId, `${tecnicoNome}: ${mensagem}`);
            console.log(`Mensagem enviada do técnico para o usuário ${usuarioId}: ${mensagem}`);
          } else {
            await client.sendText(chatId, 'O usuário não está em modo de conversa direta com você.');
          }
        } else {
          await client.sendText(chatId, 'Formato inválido. Use: *send* + mensagem');
        }
      } else {
        const tecnicoId = conversaDireta[chatId];
        await client.sendText(tecnicoId, `Mensagem do usuário: ${message.body}`);
      }
      return;
    }
  
    // Verifica se o técnico deseja ativar o modo de conversa direta
    if (tecnicosNumeros.includes(chatId) && message.body.toLowerCase().startsWith('conversar com')) {
      const usuarioNumero = message.body.split(' ').pop();
      const usuarioId = `${usuarioNumero}@c.us`;
      conversaDireta[usuarioId] = chatId;
      conversaDireta[chatId] = usuarioId;
      await client.sendText(chatId, `Modo de conversa direta ativado com o usuário ${usuarioNumero}.`);
      await client.sendText(usuarioId, 'O técnico ativou o modo de conversa direta com você.');
      return;
    }
  
    // Fluxo padrão para mensagens fora do modo de conversa direta
    const userState = userStates[chatId];
    if (userState === 'aguardando_tipo_problema') {
      // Usuário está selecionando o tipo de problema
      const tipoProblema = message.body.trim();
      
      // Mapeamento dos números para os tipos de problemas com emojis
      const tiposValidos = {
          '1': '🌐 Internet',
          '2': '🖨️ Impressora',
          '3': '🖥️ MV',
          '4': '💻 Computador',
          '5': '🔧 Outros'
      };

      const exemplosProblemas = {
        '1': '🌐 *Internet*: "Minha internet não está funcionando, estou no 2º andar, prédio 1, consultório 202."',
        '2': '🖨️ *Impressora*: "A impressora do setor de recepção não está imprimindo, modelo HP LaserJet 2002, aparece erro de papel atolado."',
        '3': '🖥️ *MV*: "Não consigo acessar o sistema MV, aparece erro de login inválido ao tentar entrar no sistema no computador da triagem."',
        '4': '💻 *Computador*: "Meu computador não liga, está na sala do RH, mesa 3, só pisca a luz e desliga novamente."',
        '5': '🔧 *Outros*: "Preciso de ajuda para configurar um novo e-mail para um colaborador, setor financeiro, nome do colaborador: João Silva."'
      };

      if (tiposValidos[tipoProblema]) {
        userStates[chatId] = 'aguardando_descricao'; // Atualiza o estado para aguardar a descrição do problema
        userStates[`${chatId}_problema`] = tiposValidos[tipoProblema]; // Salva o tipo de problema temporariamente
        await client.sendText(chatId, `Você selecionou o tipo de problema: *${tiposValidos[tipoProblema]}* 😊.\n\nAgora, por gentileza, descreva o problema com detalhes.\n\n📌 *Inclua na sua descrição:*\n- Prédio, andar e número do consultório (se aplicável);\n- Caso seja uma unidade externa, informe a unidade e a descrição do problema;\n- Se for necessário acesso remoto, informe o número do AnyDesk ou Assistência Remota.\n\n📌 *Exemplo de descrição:*\n${exemplosProblemas[tipoProblema]}`);
      } else {
        await client.sendText(chatId, '❌ *Número inválido!* Por favor, escolha um número correspondente ao tipo de problema:\n\n 1️⃣ - 🌐 *Internet*\n 2️⃣ - 🖨️ *Impressora*\n 3️⃣ - 🖥️ *MV*\n 4️⃣ - 💻 *Computador*\n 5️⃣ - 🔧 *Outros*');
      }
    } else if (userState === 'aguardando_descricao') {
      if (message.body.toLowerCase() === 'problema resolvido') {
        console.log(`Chamado do usuário ${chatId} foi fechado.`);
        await client.sendText(chatId, '✨ *Problema resolvido! Chamado fechado com sucesso.*');
        userStates[chatId] = null; // Reseta o estado do usuário
      } else {
        const descricaoProblema = message.body;
        const tipoProblema = userStates[`${chatId}_problema`] || 'não especificado';
    
        console.log("Enviando solicitação aos técnicos...");
    
        for (const tecnicoNumero of tecnicosNumeros) {
          await client.sendText(tecnicoNumero, `Novo chamado recebido:\n\n*Tipo de problema:* ${tipoProblema}\n*Descrição do problema:* ${descricaoProblema}\n*Solicitante:* ${chatId.replace('@c.us', '')}`);
        }
    
        await client.sendText(chatId, 'Seu chamado foi enviado para os técnicos e eles irão te auxiliar o mais rápido possível.\nlembre-se de ativar o seu acesso remoto (AnyDesk ou Assistencia Remota) 😊\nCaso seu problema tenha sido resolvido, envie *"Problema resolvido"* para fechar o chamado ou *"Abrir outro chamado"* para iniciar um novo.');
    
        chamados.push({
          chatId,
          problema: tipoProblema,
          descricao: descricaoProblema,
          data: new Date().toLocaleString('pt-BR')
        });
    
        salvarChamadosCSV(chamados);
    
        userStates[chatId] = 'chamado_aberto';
      }
    } else if (userState === 'chamado_aberto') {
      if (message.body.toLowerCase() === 'problema resolvido') {
        console.log(`Chamado do usuário ${chatId} foi fechado.`);
        await client.sendText(chatId, ' *Problema resolvido!* Chamado fechado com sucesso.😊');
        for (const tecnicoNumero of tecnicosNumeros) {
          await client.sendText(tecnicoNumero, `O chamado do usuário ${chatId.replace('@c.us', '')} foi resolvido.`);
        }
        userStates[chatId] = null;
      } else if (message.body.toLowerCase().includes('abrir outro chamado')) {
        console.log(`Usuário ${chatId} deseja abrir outro chamado.`);
        await client.sendText(chatId, '🔄 *Você pode abrir um novo chamado!*\nPor favor, escolha o número do problema:\n 1️⃣  - 🌐 *Internet*\n 2️⃣ - 🖨️ *Impressora*\n 3️⃣ - 🖥️ *MV*\n 4️⃣ - 💻 *Computador*\n 5️⃣ - 🔧 *Outros*');
        userStates[chatId] = 'aguardando_tipo_problema';
      } else {
        await client.sendText(chatId, '⚠️ *Você já possui um chamado em aberto.* Deseja abrir outro chamado ou fechar o atual? Responda com "*Problema resolvido*" para fechar o chamado ou envie "*Abrir outro chamado*" para iniciar um novo.');
      }
    } else {
      console.log("Enviando mensagem inicial...");
      await client.sendText(chatId, ' Olá! 😊 Você está falando com a equipe de TI Infra.\nPor favor, escolha o número correspondente ao tipo de problema:\n\n 1️⃣  - 🌐 *Internet*\n 2️⃣ - 🖨️ *Impressora*\n 3️⃣ - 🖥️ *MV*\n 4️⃣ - 💻 *Computador*\n 5️⃣ - 🔧 *Outros*');
      userStates[chatId] = 'aguardando_tipo_problema';
    }
  });
}

function salvarChamadosCSV(chamados) {
  const filePath = path.join(__dirname, 'chamados.csv');
  const header = 'Chat ID;Problema;Descricao;Data\n';
  const bom = '\uFEFF';
  let csvContent = '';
  
  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const existingRows = existingContent.split('\n').slice(1).filter(row => row.trim() !== '');
    
    const chamadosExistentes = existingRows.map(row => {
      const [chatId, problema, descricao, data] = row.split(';').map(col => col.replace(/"/g, ''));
      return { chatId, problema, descricao, data };
    });
    
    const todosChamados = [...chamadosExistentes, ...chamados];
    
    const rows = todosChamados.map(chamado => {
      const chatIdSemSufixo = chamado.chatId.replace('@c.us', '');
      return `"${chatIdSemSufixo}";"${chamado.problema}";"${chamado.descricao}";"${chamado.data}"`;
    }).join('\n');
    csvContent = header + rows;
  } else {
    const rows = chamados.map(chamado => {
      const chatIdSemSufixo = chamado.chatId.replace('@c.us', '');
      return `"${chatIdSemSufixo}";"${chamado.problema}";"${chamado.descricao}";"${chamado.data}"`;
    }).join('\n');
    csvContent = header + rows;
  }
  
  fs.writeFileSync(filePath, bom + csvContent, 'utf8');
  console.log('Arquivo chamados.csv salvo com sucesso!');
}
