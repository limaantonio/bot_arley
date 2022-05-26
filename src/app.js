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
const {getSubjects, login, getLesson, getTask, getTaskById, getTaskByStudent, getAction,
     getCompleted, getActionByLesson, getLessonByStudent, getStudents, insertCodeAccess, createStudent} = require('./services/api')
const apiUrl= `https://api.telegram.org/bot${process.env.token}`;
const apiFileUrl= `https://api.telegram.org/file/bot${process.env.token}`;

let matricula = 0
let data = null
let name = ''
let subject = '' 

const confirmacao = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's'),
    Markup.callbackButton('Não', 'n'),
]));

bot.hears([/oi/i, /ola/i, /iae/i, /arley/i], ctx => {
     id = ctx.update.message.from.id
    ctx.reply(`Preciso da sua matricula, clique pra fazer /login.`)
});

bot.start(async ctx => {
    const nameUser = ctx.update.message.from.first_name
    const idUser = ctx.update.message.from.id
    const data = {name: nameUser, code_access: idUser};
    const student = await createStudent(data);

    ctx.replyWithHTML(`Oi, eu sou o Arley! 😃\n\nSeja bem vindo, ${nameUser}!\n\nEstou aqui para lhe ajudar na sua jornada de estudos.\n\nAnote aí sua matricula: <b>${student.registration}</b>, pois ela será importante para que eu o identifique.`)
});

const echoScene = new Scene('echo');
echoScene.enter(ctx => ctx.reply('Entrando em Echo Scene'));
echoScene.leave(ctx => ctx.reply('Saindo de Echo Scene'));
echoScene.command('sair', leave());
echoScene.on('text', ctx => ctx.reply(ctx.message.text));
echoScene.on('message', ctx => ctx.reply('Apenas mensagens de texto, por favor'));

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
});

dataHandler.use(ctx => ctx.reply('Entre com uma data no formato dd/MM/YYYY'));

const confirmacaoHandler = new Composer()
confirmacaoHandler.action('s', ctx => {
    ctx.reply('Cadastro confirmado!')
    ctx.scene.leave()
});

confirmacaoHandler.action('n', ctx => {
    ctx.reply('Cadastro excluído!')
    ctx.scene.leave()
});

confirmacaoHandler.use(ctx => ctx.reply('Apenas confirme', confirmacao));

const botoesSubject = subjects => {
    const botoes = subjects.map(item => {
    
    return [Markup.callbackButton(`${item.name}`, `select ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

const botoesSubject2 = subjects => {
    const botoes = subjects.map(item => {
    
    return [Markup.callbackButton(`${item.name}`, `selectLesson ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

let tarefas = [];
let lessons = [];
let tasks = [];
let action;

//recomendacao
bot.action(/select (.+)/, async ctx => {
    tarefas = tarefas.filter(item => item !== ctx.match[1])
    lessons = await getLesson(ctx.match[1]);
   
    ctx.reply(`Você possui aulas para essas disciplina. Sobre qual você quer falar?`, botoesLesson(lessons))
});

bot.action(/selectLesson (.+)/, async ctx => {
    tarefas = tarefas.filter(item => item !== ctx.match[1])
    //lessons = await getLesson(ctx.match[1]);
    if(student) {
        lessons = await getLessonByStudent(student.id);
    }

    if (lessons.length > 0) {
        ctx.reply(`Sobre qual aula você quer falar?!`, botoesLessonComplete(lessons))
    } else {
        ctx.reply(`Nenhuma aula está atribuida a você`);
    }
});

const botoesLesson = lessons => {
    const botoes = lessons.map(item => {
   
    return [Markup.callbackButton(`${item.title}`, `selectTask ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

const botoesLessonComplete = lessons => {
    const botoes = lessons.map(item => {
   
    return [Markup.callbackButton(`${item.title}`, `selectTask2 ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

bot.action(/selectTask (.+)/, async ctx => {
    lessons = lessons.filter(item => item !== ctx.match[1])
    tasks = await getTask(ctx.match[1]);
   
   
     ctx.reply(`Aqui estão as tarefas sobre essa aula. Selecione uma das opções.`, botoesTask(tasks))
});

const confirmacaoResponderQuiz = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's_resp_quiz'),
    Markup.callbackButton('Não', 'n'),
]));

bot.action(/selectTask2 (.+)/, async ctx => {
    lessons = lessons.filter(item => item !== ctx.match[1])
    if (student) {
        tasks = await getCompleted(ctx.match[1], student.id);
    }

    action = await getActionByLesson(ctx.match[1]);

    if (tasks.number_tasks === '0'){
        ctx.reply(`Obá você já concluiu todas atividades. Que tal responder um Quiz para aprimorar seus conhecimentos?`, confirmacaoResponderQuiz)
    } else {
        ctx.reply(`Vi que você tem atividades concluídas.  Selecione uma delas.`,   botoesTaskNotComplete(taskStudent))
    }
});

const botoesTaskNotComplete = taskStudent => {
    const botoes = taskStudent.map(item => {
    return [Markup.callbackButton(`${item.task.name}`, `selectTaskNotCompleteItem ${item.task.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

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
});

//REVISÃO -> Se nota >= ? em uma atividade x da aula invertida, não concluiu a aula invertida e se passaram ? dias
bot.action(/selectTaskNotCompleteItem (.+)/, async ctx => {
    student_task = taskStudent.filter(async item => {
        const nota = new Number(item.score);
        const esperada = new Number(item.task.expected_score);
   
        if (nota >= esperada) {
            ctx.replyWithHTML(`<b>Aqui está sua atividade concluída.</b> 
            \n🟢 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. Parabéns!\nVocê deseja realizar um QUIZ para testar seus conhecimentos?\n\n`, confirmacaoTaskRevisaoNotaSuperiorFinalizouTask)
        } else {
            ctx.replyWithHTML(`<b>Aqui sua(s) atividade(s) concluída(s).</b> 
            \n🔴 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. A nota é inferior a esperada.\nDeseja fazer uma revisão?\n\n`)
        }
    });
});

const confirmacaoTaskRevisaoNotaSuperiorFinalizouTask = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's_quiz_task'),
    Markup.callbackButton('Não', 'n'),
]));

const wizardRecomendacao = new WizardScene('recomendacao',
    async ctx => {  
        tarefas = await getSubjects()
        ctx.reply(`Qual disciplina você quer falar?`, botoesSubject(tarefas))
        ctx.wizard.next()
    },
    ctx => {
       
        ctx.reply('Vi que tem algumas atividades para essa disciplina.')
        ctx.wizard.next()
    },
    dataHandler,
    confirmacaoHandler
);

wizardRecomendacao.leave(ctx => ctx.reply('Saindo do cadastro'))
wizardRecomendacao.command('sair_do_cadastro', leave())

const botoesTaskStudent = taskStudent => {
    const botoes = taskStudent.map(item => {

    return [Markup.callbackButton(`${item.task.name}`, `selectTaskStudent ${item.id}`)]
    })
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

const confirmacaoTaskRevisaoNotaSuperior = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's_quiz'),
    Markup.callbackButton('Não', 'n'),
]));

let taskStudent = [];

bot.action(/selectTaskStudent (.+)/, async ctx => {
    taskStudent = taskStudent.filter(async item => {

        action = await getAction(item.task.id);
       
        const nota = new Number(item.score);
        const esperada = new Number(item.task.expected_score);
     
        if (nota >= esperada) {
            ctx.replyWithHTML(`<b>Aqui está sua atividade concluída.</b> 
            \n🟢 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. Parabéns!\nVocê deseja realizar um QUIZ para testar seus conhecimentos?\n\n`, confirmacaoTaskRevisaoNotaSuperior)
        } else {
            ctx.replyWithHTML(`<b>Aqui sua(s) atividade(s) concluída(s).</b> 
            \n🔴 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. A nota é inferior a esperada.\nDeseja fazer uma revisão?\n\n`, confirmacao)
        }
    });
});

const confirmacaoHandlerRevisao = new Composer()
confirmacaoHandlerRevisao.action('s', async ctx => {

    action.listActions.filter(async item => {
        if(item.title === '')
    ctx.replyWithHTML(`<b>Muito bem! Aqui está uma tarefa deixada pelo seu professor que vai servir de revisão.</b> 
    \nTrata-se de um ${item.title} que deve ser resolvido até o dia ${moment(item.dt_complete_class).format('YYYY-MM-DD')}.\n\n
    ${item.content_url}`)
    })
    ctx.scene.leave()
});

confirmacaoHandlerRevisao.action('s_quiz', ctx => {
    action.listActions.filter(async item => {
    ctx.replyWithHTML(`<b>Muito bem! Aqui está um QUIZ deixada pelo seu professor que vai servir para aprimorar seus conhecimentos.</b> 
    ${item.content_url}`)
    })
    ctx.scene.leave()
});

confirmacaoHandlerRevisao.action('s_resp_quiz', async ctx => {
    action.filter(async item => {
        ctx.replyWithHTML(`<b>Muito bem! Aqui está um QUIZ deixada pelo seu professor que vai servir para aprimorar seus conhecimentos.</b> 
        ${item.content_url}`)
        })
        ctx.scene.leave()
});

confirmacaoHandlerRevisao.action('s_quiz_task', async ctx => {
    action.filter(async item => {
        ctx.replyWithHTML(`<b>Muito bem! Aqui está um QUIZ deixada pelo seu professor que vai servir para aprimorar seus conhecimentos.</b> 
        ${item.content_url}`)
        })
        ctx.scene.leave()
    console.log(action)
});

confirmacaoHandlerRevisao.action('n', ctx => {
    ctx.reply('Tudo bem! Qualquer coisa é só utilizar os comandos citados acima.')
    ctx.scene.leave()
});


const wizardRevisao = new WizardScene('revisao',
    async ctx => {  
        subjects = await getSubjects()
        ctx.reply(`Qual disciplina você quer falar?`, botoesSubject2(subjects))

        if(student) {
            taskStudent = await getTaskByStudent (student.id)
        }
        ctx.wizard.next()
    },
    confirmacaoHandlerRevisao
);
/*-------------------------------WIZARD REVISAO FIM ---------------------------*/

/*-------------------------------WIZARD LOGIN INICIO ---------------------------*/
const loginHandler = new Composer()
loginHandler.hears(/[A-z0-9]/, ctx => {
    matricula = ctx.update.message.text
    ctx.reply(`Confirmar?`, confirmacao)
    ctx.wizard.next()
});

var student;

const confirmacaoLoginHandler = new Composer()
confirmacaoLoginHandler.action('s', async ctx => {
    student = await login(matricula);

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
        ctx.reply('Qual sua matricula?')
        ctx.wizard.next()
    },
    loginHandler,
    confirmacaoLoginHandler
)
wizardLogin.leave();
wizardLogin.command('sair_do_login', leave())
/*-------------------------------WIZARD LOGIN FIM ---------------------------*/
/*-------------------------------WIZARD LOGIN INICIO ---------------------------*/
const confirmacaoMonitoramento = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim',`reponder`),
    Markup.callbackButton('Não', 'n'),
]));
var pri1;
const prioridade2Handler = new Composer()
prioridade2Handler.hears(/[A-z0-9]/, ctx => {
    pri1 = ctx.update.message.text;
    console.log(pri1);
    ctx.reply('Qual sua prioridade 2?')
    ctx.wizard.next()
});

const prioridade3Handler = new Composer()
prioridade3Handler.hears(/[A-z0-9]/, ctx => {
   
    pri1 = ctx.update.message.text;
    ctx.reply('Qual sua prioridade 3?')
    console.log(pri1);
    ctx.wizard.next()
});

const prioridadeSend = new Composer()
prioridadeSend.hears(/[A-z0-9]/, ctx => {
   
    pri1 = ctx.update.message.text;
    ctx.reply(`Confirmar?`, confirmacao)
    ctx.wizard.next()
});

const wizardMonitoramento = new WizardScene(`reponder`,
    ctx => {
        ctx.reply('Qual sua prioridade 1?')
        ctx.wizard.next()
    },
    prioridade2Handler,
    prioridade3Handler,
    prioridadeSend,
    confirmacaoLoginHandler
)
let feed;
// const confirmacaoHandlerMonitoramento = new Composer()
// confirmacaoHandlerMonitoramento.action('resposta', async ctx => {
//     ctx.reply('Teste monitoramento.')
// });





/*-------------------------------WIZARD LOGIN FIM ---------------------------*/
const stage = new Stage([echoScene, wizardRecomendacao, wizardRevisao, wizardMonitoramento, wizardLogin])
bot.use(session())
bot.use(stage.middleware())
bot.command('revisao', enter('revisao'))
bot.command('recomendacao', enter('recomendacao'))
bot.command('reponder', enter('reponder'))
bot.command('login', enter('login'))
//fallback
bot.on('message', ctx => ctx.reply(`Desculpe, não compreendi.🙁 Você pode tentar outro comandos: \n
🔓 Para primeiro acesso entre com /login
📖 Para revisão entre /revisao
📚 Para recomendação de conteúdos entre com /recomendacao`))

stage.action('reponder');

async function notificar () {
   const listStudent = await getStudents();

   listStudent.map((student) => {
        telegram.sendMessage(student.code_access, `Bom dia! Quais são suas prioridades para está semana? Gostaria de responder agora?`, confirmacaoMonitoramento);
        //telegram.sendMessage(student.code_access, `Bom dia! Quais são suas prioridades para está semana? Gostaria de responder agora? /reponder`);
    });
};

//const s = 10;

//const notificacao = new schedule.scheduleJob(`*/${s} * * * * *`, notificar)
const notificacao = new schedule.scheduleJob(`15 59 6 * * 1-5`, notificar)

bot.startPolling();

module.exports = app;