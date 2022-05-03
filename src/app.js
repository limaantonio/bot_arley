require("dotenv").config();
const Telegraf = require('telegraf')
const Telegram = require('telegraf/telegram')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const Composer = require('telegraf/composer')
const WizardScene = require('telegraf/scenes/wizard')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const { enter, leave } = Stage
const schedule = require('node-schedule')
const telegram = new Telegram(process.env.token)
const bot = new Telegraf(process.env.token)
const express = require('express');
const moment = require('moment');
const app = express();
const {getTarefas, login, getLesson, getTask, getTaskById, getTaskByStudent, getAction} = require('./services/api')
const apiUrl= `https://api.telegram.org/bot${process.env.token}`;
const apiFileUrl= `https://api.telegram.org/file/bot${process.env.token}`;

let matricula = 0
let data = null
let name = ''
let subject = ''

const confirmacao = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's'),
    Markup.callbackButton('Não', 'n'),
]))

bot.hears([/oi/i, /ola/i, /iae/i, /arley/i], ctx => {
   // const name = ctx.update.message.from.id
    ctx.reply(`Oi, eu sou o Arley! 😃\n
Estou aqui para lhe ajudar na sua jornada de estudos.
Antes de tudo, preciso dos seus dados, clique pra fazer /login.`)
})

bot.start(ctx => {
    const name = ctx.update.message.from.first_name
    ctx.reply(`Seja bem vindo, ${name}!`)
    ctx.reply(`Entre com /echo `)
})

const echoScene = new Scene('echo')
echoScene.enter(ctx => ctx.reply('Entrando em Echo Scene'))
echoScene.leave(ctx => ctx.reply('Saindo de Echo Scene'))
echoScene.command('sair', leave())
echoScene.on('text', ctx => ctx.reply(ctx.message.text))
echoScene.on('message', ctx => ctx.reply('Apenas mensagens de texto, por favor'))

/*-------------------------------WIZARD REVISAO INICIO ---------------------------*/

const dataHandler = new Composer()
dataHandler.hears(/(\d{2}\/\d{2}\/\d{4})/, ctx => {
    data = ctx.match[1]
    ctx.reply(`Revise seus seus dados:
    Nome: ${name}
    Matricula: ${matricula}
    Data: ${data}
    Tudo certo?`, confirmacao)
    ctx.wizard.next()
})

dataHandler.use(ctx => ctx.reply('Entre com uma data no formato dd/MM/YYYY'))

const confirmacaoHandler = new Composer()
confirmacaoHandler.action('s', ctx => {
    ctx.reply('Cadastro confirmado!')
    ctx.scene.leave()
})

confirmacaoHandler.action('n', ctx => {
    ctx.reply('Cadastro excluído!')
    ctx.scene.leave()
})

confirmacaoHandler.use(ctx => ctx.reply('Apenas confirme', confirmacao))

const botoesAgenda = tarefas => {
    const botoes = tarefas.map(item => {
    
    return [Markup.callbackButton(`${item.name}`, `select ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

let tarefas = [];
let lessons = [];
let tasks = [];

bot.action(/select (.+)/, async ctx => {
    tarefas = tarefas.filter(item => item !== ctx.match[1])
    lessons = await getLesson(ctx.match[1]);
   
    ctx.reply(`Sobre qual aula você quer falar?`, botoesLesson(lessons))
})

const botoesLesson = lessons => {
    const botoes = lessons.map(item => {
   
    return [Markup.callbackButton(`${item.title}`, `selectTask ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

bot.action(/selectTask (.+)/, async ctx => {
    lessons = lessons.filter(item => item !== ctx.match[1])
    tasks = await getTask(ctx.match[1]);
   
     ctx.reply(`Aqui estão as tarefas sobre essa aula. Selecione uma das opções.`, botoesTask(tasks))
})

const botoesTask = lessons => {
    const botoes = lessons.map(item => {
   
    return [Markup.callbackButton(`${item.name}`, `selectTaskItem ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

bot.action(/selectTaskItem (.+)/, async ctx => {
    tasks = tasks.filter(item => item !== ctx.match[1])
    task = await getTaskById(ctx.match[1]);
   
    ctx.replyWithHTML(`<b>Muito bem! Aqui está uma tarefa deixada pelo seu professor que vai servir de revisão. 
    \nTrata-se de um ${task.type} que deve ser resolvido até o dia 20/04/2022.</b> \n\n
    ${task.content_url}`)
})

const wizardRecomendacao = new WizardScene('recomendacao',
    async ctx => {  
        tarefas = await getTarefas()
        ctx.reply(`Qual disciplina você quer falar?`, botoesAgenda(tarefas))
     
        ctx.wizard.next()
    },
    ctx => {
       
        ctx.reply('Vi que tem algumas atividades para essa disciplina.')
        ctx.wizard.next()
    },
    
    dataHandler,
    confirmacaoHandler
)

wizardRecomendacao.leave(ctx => ctx.reply('Saindo do cadastro'))
wizardRecomendacao.command('sair_do_cadastro', leave())

const botoesTaskStudent = taskStudent => {
    const botoes = taskStudent.map(item => {

    return [Markup.callbackButton(`${item.task.name}`, `selectTaskStudent ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

let taskStudent = [];
let action;
bot.action(/selectTaskStudent (.+)/, async ctx => {
    taskStudent = taskStudent.filter(async item => {

        action = await getAction(item.task.id);
       
        const nota = new Number(item.score);
        const esperada = new Number(item.task.expected_score);
     
        if (nota >= esperada) {
            ctx.replyWithHTML(`<b>Aqui está sua atividade concluída.</b> 
            \n🟢 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. Parabéns!\nVocê deseja realizar um QUIZ para testar seus conhecimentos?\n\n`)
        } else {
            ctx.replyWithHTML(`<b>Aqui sua(s) atividade(s) concluída(s).</b> 
            \n🔴 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. A nota é inferior a esperada.\nDeseja fazer uma revisão?\n\n`, confirmacao)
        }
       
    })
  //  ctx.wizard.next()
})



const confirmacaoHandlerRevisao = new Composer()
confirmacaoHandlerRevisao.action('s', async ctx => {

    action.listActions.filter(async item => {
        ctx.replyWithHTML(`<b>Muito bem! Aqui está uma tarefa deixada pelo seu professor que vai servir de revisão.</b> 
        \nTrata-se de um ${item.title} que deve ser resolvido até o dia ${moment(item.dt_complete_class).format('YYYY-MM-DD')}.\n\n
    ${item.content_url}`)
    })
    ctx.scene.leave()
})

confirmacaoHandlerRevisao.action('n', ctx => {
    ctx.reply('Ok.')
    ctx.scene.leave()
})


const wizardRevisao = new WizardScene('revisao',
    async ctx => {  

        if(student) {
            taskStudent = await getTaskByStudent(student.id)
        }

        if (taskStudent === 0) {
            ctx.reply(`Você não tem nenhuma tarefa concluída.`)
        } else {
          
           ctx.reply(`Selecione uma das atividades para continuar`, botoesTaskStudent(taskStudent))
        }
        ctx.wizard.next()
    },
    confirmacaoHandlerRevisao
)

/*-------------------------------WIZARD REVISAO FIM ---------------------------*/

/*-------------------------------WIZARD LOGIN INICIO ---------------------------*/
const loginHandler = new Composer()
loginHandler.hears(/[A-z0-9]/, ctx => {
    matricula = ctx.update.message.text
    ctx.reply(`Revise seus seus dados:
Nome: ${name}
Matricula: ${matricula}
Tudo certo?`, confirmacao)
    ctx.wizard.next()
})

var student;

const confirmacaoLoginHandler = new Composer()
confirmacaoLoginHandler.action('s', async ctx => {
    student = await login(name, matricula);

    if (student) {
    ctx.reply(`Login confirmado!\n
Em que posso ajudá-lo?\n
📖 Para revisão entre /revisao
📚 Para recomendação de conteúdos entre com /recomendacao\n `)
        ctx.scene.leave()
    } else {
        ctx.reply('Não foi possivel relizar o login. Por favor, verifique os dados e tente novamente. /login')
        ctx.scene.leave()
    }
})

confirmacaoLoginHandler.action('n', ctx => {
    ctx.reply('Tudo bem! Você pode entrar novamente.')
    ctx.scene.leave()
})

/*-------------------------------WIZARD LOGIN INICIO ---------------------------*/
const wizardLogin = new WizardScene('login',
    ctx => {
        ctx.reply('Como é seu nome?')
        ctx.wizard.next()
    },
    ctx => {
        name = ctx.update.message.text
        ctx.reply('Qual sua matricula?')
        ctx.wizard.next()
    },
    loginHandler,
    confirmacaoLoginHandler
)
wizardLogin.leave();
wizardLogin.command('sair_do_login', leave())

/*-------------------------------WIZARD LOGIN FIM ---------------------------*/

const stage = new Stage([echoScene, wizardRecomendacao, wizardRevisao, wizardLogin])
bot.use(session())
bot.use(stage.middleware())
bot.command('revisao', enter('revisao'))
bot.command('recomendacao', enter('recomendacao'))
bot.command('login', enter('login'))
//fallback
bot.on('message', ctx => ctx.reply(`Desculpe, não compreendi.🙁 Você pode tentar outro comandos: \n
🔓 Para primeiro acesso entre com /login
📖 Para revisão entre /revisao
📚 Para recomendação de conteúdos entre com /recomendacao`))

const notificar = () => {
    telegram.sendMessage(process.env.userID, `Acorda Antonio, bora estudar!`)
}

// const s = 10;

// const notificacao = new schedule.scheduleJob(`*/${s} * * * * *`, notificar)

bot.startPolling()

//pesamentos: para obter o id do usuario do bot (userID), acho que posso obter atraves de: const name = ctx.update.message.from.id
//no momento da primeira interação com o bot e posteriromente armazenar na tabela de student

module.exports = app;