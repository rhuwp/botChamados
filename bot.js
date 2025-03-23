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
    const tecnicosNumeros = ['554187877002@c.us']; // Lista de números dos técnicos
    const numerosExcecao = ['']; // Lista de números que o bot deve ignorar
    const userStates = {}; // Objeto para rastrear o estado de cada usuário
    const chamados = []; // Array para armazenar os chamados
    const conversaDireta = {}; // Objeto para rastrear as conversas diretas entre usuários e técnicos
    
    
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
    
        // Fluxo normal do modo de conversa direta
        if (chatId === tecnicoId) {
          // Mensagem do técnico para o usuário
          const match = message.body.match(/^send "(.*)" to "(\d+)"$/i);
          if (match) {
            const [, mensagem, usuarioNumero] = match;
            const usuarioId = `${usuarioNumero}@c.us`;
            if (conversaDireta[usuarioId] === tecnicoId) {
              await client.sendText(usuarioId, `Mensagem do Técnico de Suporte: ${mensagem}`);
              console.log(`Mensagem enviada do técnico para o usuário ${usuarioId}: ${mensagem}`);
            } else {
              await client.sendText(tecnicoId, 'O usuário não está em modo de conversa direta com você.');
            }
          } else {
            await client.sendText(tecnicoId, 'Formato inválido. Use: send "mensagem" to "numero do usuario".');
          }
        } else {
          // Mensagem do usuário para o técnico
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
        const tipoProblema = message.body.toLowerCase();
        const tiposValidos = ['internet', 'impressora', 'mv','computador', 'outros'];
    
        if (tiposValidos.includes(tipoProblema)) {
          userStates[chatId] = 'aguardando_descricao'; // Atualiza o estado para aguardar a descrição do problema
          userStates[`${chatId}_problema`] = tipoProblema; // Salva o tipo de problema temporariamente
          await client.sendText(chatId, `Você selecionou o tipo de problema: *${tipoProblema}*. 😊\nAgora, por gentileza, descreva o problema com detalhes. Não se esqueça de informar:\n- Prédio, andar e número do consultório (se aplicável);\n- Caso seja uma unidade externa, informe a unidade e a descrição do problema.`);
        } else {
          await client.sendText(chatId, 'Tipo de problema inválido. Por favor, escolha entre: Internet, Impressora, Computador, MV ou Outros.');
        }
      } else if (userState === 'aguardando_descricao') {
        if (message.body.toLowerCase() === 'problema resolvido') {
          // Fecha o chamado
          console.log(`Chamado do usuário ${chatId} foi fechado.`);
          await client.sendText(chatId, 'Obrigado por nos informar! O chamado foi fechado com sucesso.');
          userStates[chatId] = null; // Reseta o estado do usuário
        } else {
          // Usuário está descrevendo o problema
          const descricaoProblema = message.body;
          const tipoProblema = userStates[`${chatId}_problema`] || 'não especificado'; // Recupera o tipo de problema
    
          console.log("Enviando solicitação aos técnicos...");
    
          // Envia a mensagem para técnicos
          for (const tecnicoNumero of tecnicosNumeros) {
            await client.sendText(tecnicoNumero, `Novo chamado recebido:\n\n*Tipo de problema:* ${tipoProblema}\n*Descrição do problema:* ${descricaoProblema}\n*Solicitante:* ${chatId.replace('@c.us', '')}`);
          }
    
          await client.sendText(chatId, 'Seu chamado foi enviado para os técnicos e eles irão te auxiliar o mais rápido possível. 😊\n caso seu problema tenha sido resolvido, envie "Problema resolvido" para fechar o chamado ou "Abrir outro chamado" para iniciar um novo');
    
          // Adiciona o chamado ao array
          chamados.push({
            chatId,
            problema: tipoProblema,
            descricao: descricaoProblema,
            data: new Date().toLocaleString('pt-BR') // Data e hora do chamado
          });
    
          // Salva os chamados em um arquivo CSV
          salvarChamadosCSV(chamados);
    
          // Reseta o estado do usuário
          userStates[chatId] = 'chamado_aberto';
        }
      } else if (userState === 'chamado_aberto') {
        if (message.body.toLowerCase() === 'problema resolvido') {
          // Fecha o chamado
          console.log(`Chamado do usuário ${chatId} foi fechado.`);
          await client.sendText(chatId, 'Obrigado por nos informar! O chamado foi fechado com sucesso.');
          for (const tecnicoNumero of tecnicosNumeros) {
            await client.sendText(tecnicoNumero, `O chamado do usuário ${chatId.replace('@c.us', '')} foi resolvido.`);
          }
          userStates[chatId] = null; // Reseta o estado do usuário
        } else if (message.body.toLowerCase().includes('abrir outro chamado')) {
          // Permite abrir outro chamado
          console.log(`Usuário ${chatId} deseja abrir outro chamado.`);
          await client.sendText(chatId, 'Por favor, que tipo de problema você está tendo? Internet, Impressora, Computador, MV ou Outros.');
          userStates[chatId] = 'aguardando_tipo_problema'; // Atualiza o estado para aguardar o tipo de problema
        } else {
          // Usuário já possui um chamado em aberto
          await client.sendText(chatId, 'Você já possui um chamado em aberto. Deseja abrir outro chamado ou fechar o atual? Responda com "*Problema resolvido*" para fechar o chamado ou envie "*Abrir outro chamado*" para iniciar um novo.');
        }
      } else {
        // Mensagem inicial para qualquer outra entrada
        console.log("Enviando mensagem inicial...");
        await client.sendText(chatId, 'Olá! 😊 Você está falando com a equipe de TI Infra.\nPor favor, nos informe qual tipo de problema você está enfrentando:\n\n *Internet*\n *Impressora*\n *MV*\n  *Computador*\n *Outros*\n');
        userStates[chatId] = 'aguardando_tipo_problema';
      }
    });
  
  
}






function salvarChamadosCSV(chamados) {
    const filePath = path.join(__dirname, 'chamados.csv'); // Caminho do arquivo CSV
    const header = 'Chat ID;Problema;Descricao;Data\n';
    const bom = '\uFEFF';
    let csvContent = '';
  
    // Verifica se o arquivo já existe
    if (fs.existsSync(filePath)) {
      // Lê o conteúdo existente do arquivo
      const existingContent = fs.readFileSync(filePath, 'utf8');
      const existingRows = existingContent.split('\n').slice(1).filter(row => row.trim() !== ''); // Remove o cabeçalho e linhas vazias
  
      // Adiciona os chamados existentes ao array
      const chamadosExistentes = existingRows.map(row => {
        const [chatId, problema, descricao, data] = row.split(';').map(col => col.replace(/"/g, ''));
        return { chatId, problema, descricao, data };
      });
  
      // Combina os chamados existentes com os novos
      const todosChamados = [...chamadosExistentes, ...chamados];
  
      // Gera o conteúdo CSV
      const rows = todosChamados.map(chamado => {
        const chatIdSemSufixo = chamado.chatId.replace('@c.us', ''); // Remove o sufixo @c.us
        return `"${chatIdSemSufixo}";"${chamado.problema}";"${chamado.descricao}";"${chamado.data}"`;
      }).join('\n');
      csvContent = header + rows;
    } else {
      // Cria o conteúdo CSV com os novos chamados
      const rows = chamados.map(chamado => {
        const chatIdSemSufixo = chamado.chatId.replace('@c.us', ''); // Remove o sufixo @c.us
        return `"${chatIdSemSufixo}";"${chamado.problema}";"${chamado.descricao}";"${chamado.data}"`;
      }).join('\n');
      csvContent = header + rows;
    }
  
    // Escreve o conteúdo no arquivo
    fs.writeFileSync(filePath, bom + csvContent, 'utf8');
    console.log('Arquivo chamados.csv salvo com sucesso!');
  }