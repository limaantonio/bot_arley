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
    getTaskPenndigByLessonByStudent, taskByLessonAndStudent, getTaskByStudentPennding, getActionByLesson, 
    getLessonByStudent, getTaskByStudentStatus, getActions, getStudents, insertCodeAccess, updateStudent} = require('./services/api')

let matricula = ''//esta tudo bem ficar global
let idUser = ''//esta tudo bem ficar global
let action;//talvez nao
var student;//esta tudo bem ficar global
let taskStudent = [];
let tarefas = [];
let lessons = [];
let tasks = [];
let task;
let typeBot = '';

bot.hears([/oi/i, /ola/i, /iae/i, /arley/i], ctx => {
    id = ctx.update.message.from.id
    ctx.reply(`Preciso da sua matricula, clique pra fazer /login.`)
});

bot.start(async ctx => {
    const nameUser = ctx.update.message.from.first_name
    idUser = ctx.update.message.from.id
    
    ctx.replyWithHTML(`Oi, eu sou o Arley! 😃\n\nSeja bem vindo, ${nameUser}!\n\nEstou aqui para lhe ajudar na sua jornada de estudos.\n\n Antes de continuarmos, informe sua matricula, clique em /iniciar`)
});

// const confirmacaoHandler = new Composer()
// confirmacaoHandler.action('s', ctx => {
//     ctx.reply('Cadastro confirmado!')
//     ctx.scene.leave()
// });

//confirmacaoHandler.use(ctx => ctx.reply('Apenas confirme', confirmacao));

/*---------------------------------BOTOES INICIO -----------------------------*/
/*---------------------------------Botoes de confirmacao ---------------------*/
const confirmacao = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's'),
    Markup.callbackButton('Não', 'n'),
]));

const confirmacaoTaskRevisaoNotaSuperior = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's_quiz'),
    Markup.callbackButton('Não', 'n'),
]));

//alterar aqui
const confirmacaoResponderQuiz = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's_resp_quiz'),
    Markup.callbackButton('Não', 'n'),
]));

const confirmacaoTaskRevisaoNotaSuperiorFinalizouTask = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 's_quiz_task'),
    Markup.callbackButton('Não', 'n'),
]));


/*---------------------------------Botoes de confirmacao Fim------------------*/





const botoesLessonComplete = lessons => {
    const botoes = lessons.map(item => {
        return [Markup.callbackButton(`${item.title}`, `selectTask2 ${item.id}`)]
    });
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

const botoesTaskNotComplete = taskStudent => {
    const botoes = taskStudent.map(item => {
        return [Markup.callbackButton(`${item.task.name}`, `selectTaskNotCompleteItem ${item.task.id}`)]
    });
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}



const botoesTaskStudent = taskStudent => {
    const botoes = taskStudent.map(item => {
        return [Markup.callbackButton(`${item.task.name}`, `selectTaskStudent ${item.id}`)]
    });
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}
/*---------------------------------BOTOES FIM --------------------------------*/
/*---------------------------------ACOES INICIO ------------------------------*/
bot.action(/select (.+)/, async ctx => {
    tarefas = tarefas.filter(item => item !== ctx.match[1])
    lessons = await getLesson(ctx.match[1]);
   
    ctx.reply(`Você possui aulas para essas disciplina. Sobre qual você quer falar?`, botoesLesson(lessons))
});



bot.action(/selectTaskStudent (.+)/, async ctx => {
    taskStudent = taskStudent.filter(async item => {
        const nota = new Number(item.score);
        const esperada = new Number(item.task.expected_score);

        action = await getAction(item.task.id);
   
        if (nota >= esperada) {
            ctx.replyWithHTML(`<b>Aqui está sua atividade concluída.</b> 
            \n🟢 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. Parabéns!\nVocê deseja realizar um QUIZ para testar seus conhecimentos?\n\n`, confirmacaoTaskRevisaoNotaSuperior)
        } else {
            ctx.replyWithHTML(`<b>Aqui sua(s) atividade(s) concluída(s).</b> 
            \n🔴 ${item.task.name}\nNessa atividade você obteve ${item.score} pontos. A nota é inferior a esperada.\nDeseja fazer uma revisão?\n\n`, confirmacao)
        }
    });
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

bot.action(/selectTask2 (.+)/, async ctx => {
    lessons = lessons.filter(item => item !== ctx.match[1])
    if (student) {
        tasks = await getPenndingTaskByLessonAndStudent(ctx.match[1], student.id);
    }
    
    action = await getActionByLesson();

    if (tasks.number_tasks === '0'){
        ctx.reply(`Obá você já concluiu todas atividades. Que tal responder um Quiz para aprimorar seus conhecimentos?`, confirmacaoResponderQuiz)
    } else {
        if (student) {
            taskStudentPennding = await getTaskByStudentPennding (student.id)
            taskStudentPennding.filter(async item => {
                ctx.replyWithHTML(`<b>Aqui estão suas atividades pendentes: </b> 
                \n🔴 ${item.task.name}`)
            });
        }
    }
});
/*---------------------------------ACOES FIM ---------------------------------*/




/*---------------------------------REVISAO INICIO ----------------------------*/
//mostrando as disciplinas que o aluno está matriculado - REVISAO 2/
const botoesSubject = subjects => {
    const botoes = subjects.map(item => {
        //Monta o botão com o nome da Subject e chama a ação selectLesson e passa 
        //como parametro o item selecionado pelo aluno 
        return [Markup.callbackButton(`${item.name + ` - Professor: ` + item.teacher.name}`, `selectLesson ${item.id}`)]
    });
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

//lista as lessons que possuem tasks atribuidas a um determinado aluno
const botoesLesson = lessons => {
    botoes = lessons.map(item => {
        return [Markup.callbackButton(`${item.title}`, `selectTask ${item.id}`)]
    });
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

const botoesTask = student_tasks => {
    const botoes = student_tasks.map(item => {
        return [Markup.callbackButton(`${item.student_task.tasks[0].name}`, `selectTaskItem ${item.student_task.tasks[0].id}`)]
    });
    return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 3 }))
}

const botoesConfirmacaoRevisaoFinalizouLesson = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim', 'yes_complete'),
    Markup.callbackButton('Não', 'n'),
]));

//Aciona o a aula selecionada pelo aluno e busca a lista de Lessons atribuidas a ele - REVISAO 3/
bot.action(/selectLesson (.+)/, async ctx => {
    if (student) {
        lessons = await getLessonByStudent(student.id);
    }
    
    if (lessons.length === 0) {
        ctx.reply(`Você não possui aulas cadastradas.`)
    } else if (lessons.length > 0) {
         //verificar se a aula selcionada está com todas as tasks concluidas, caso sim, disparar a ação do estudo completo
        ctx.reply(`Selecione uma das aulas`, botoesLesson(lessons))
    }
});

//Aciona a task selecionada pelo aluno 
//ok
bot.action(/selectTask (.+)/, async ctx => {
   lesson = ctx.match[1];
   lessons.filter(item => item !== ctx.match[1])
   var completeTask = [];

    if (student) {
        task = await taskByLessonAndStudent(student.id, ctx.match[1]);
    } 

    action = await getActionByLesson(lesson);

    var entrega = true;

    if (task) {
        task.map(t => {                                                                                                                                                                                     
            if (t.student_task.status === 'PENDENTE') {
                complete = false;
            } else {
                completeTask.push(t);
            }
           
    
            action.map(a => {
                var dtTask = moment(t.student_task.dt_complete_task).format('YYYY-MM-DD');
                const dtEntregaBot = moment(dtTask).add(Number.parseInt(a.deadline), 'days'); 
              
                var today = new Date();
                //Se pelo menos uma student_task tiver a data de entrega menor (ou seja, nao se passou os dias esperado) 
                if (moment(dtEntregaBot).format('YYYY-MM-DD') > moment(today).format('YYYY-MM-DD')) {
                    entrega = false
                } 
            })
        });
    }

    console.log(completeTask)
    console.log(task)

    if (typeBot === 'RECOMENDACAO') {
        ctx.reply(`Aqui estão as tarefas sobre essa aula. Selecione uma das opções.`, botoesTask(task))
    }

    if (completeTask.length === 0 && task.length === 0) {
        ctx.reply(`Você não tem atividades para essa aula.1`)
    } else if (completeTask.length !== task.length && completeTask.length !== 0 && entrega === false && typeBot === 'REVISAO') {
        task = completeTask;
        ctx.reply(`Aqui estão as tarefas concluidas sobre essa aula. Selecione uma das opções.`, botoesTask(task))
    } else if (completeTask.length === 0 && entrega === false && typeBot === 'REVISAO') {
        ctx.reply(`Aqui estão as tarefas pendentes sobre essa aula. Selecione uma das opções.`, botoesTask(task))
    } else if (tasks && typeBot === 'REVISAO' && entrega) {
        ctx.reply(`Obá, você concluiu todas as atividades, que tal fazer um QUIZ?`, botoesConfirmacaoRevisaoFinalizouLesson);
    } else if (completeTask.length > 0 && entrega === false && typeBot === 'REVISAO'){
        ctx.reply(`Parece que você ainda está dentro do prazo de finalização da atividade.`)
        ctx.scene.leave();
    }
});

//ok
bot.action(/selectTaskItem (.+)/, async ctx => {
    action = await getAction(ctx.match[1]);
    var findAction = false;
    var action_ = []

    //adionar verificação da pontuacao
    if (action && action.length > 0 ) {
        action.map(item => {
            console.log(item)
            if (item.action.category[0].context === 'RECOMENDACAO' && typeBot === 'RECOMENDACAO') {
                //procura pela ação que possui nota inferior
                if (task[0].student_task.score <  item.action.passing_score) {
                    if (item.action.category[0].name === 'Recuperação de nota em uma atividade x de uma aula invertida') {
                        ctx.replyWithHTML(`A nota esperada nessa atividade era ${item.action.passing_score}, porém você obteve ${task[0].student_task.score}. 
Aqui está uma <b> recuperação</b> para essa atividade.
\nTrata-se de um(a) ${item.action.title}.\n\n
${item.action.content_url}`)
                        findAction = true
                        action_.push(item);
                    } else if (action.length && findAction === false && task[0].student_task.score < item.action.passing_score){
                        ctx.replyWithHTML(`Não há nenhuma ação cadastrada para essa atividade.`)
                    }
                } else {
                    if (item.action.category[0].name === 'Recomendação complementar para uma atividade x de uma aula invertida') {
                        ctx.replyWithHTML(`A nota esperada nessa atividade era ${item.action.passing_score}, você obteve ${task[0].student_task.score}.\n
Muito bem! Aqui está uma <b> recomendação</b> para essa atividade. 
\nTrata-se de um(a) ${item.action.title}. \n\n
${item.action.content_url}`)
                        findAction = true
                        action_.push(item);
                    } else if (action.length && findAction === false && task[0].student_task.score >= task[0].student_task.tasks.expected_score){
                        ctx.replyWithHTML(`Não há nenhuma ação cadastrada para essa atividade.`)
                        ctx.scene.leave();
                    }
                }
            } else if (item.action.category[0].context === 'REVISAO' && typeBot === 'REVISAO') { 
                    ctx.replyWithHTML(`<b>Muito bem! Aqui está uma tarefa deixada pelo seu professor que vai servir de revisão. 
                    \nTrata-se de um ${item.action.title} que deve ser resolvido até o dia ${item.action.dt_complete_class}.</b> \n\n
                    ${item.action.content_url}`)
                    ctx.scene.leave();
            } else {
                ctx.replyWithHTML(`Não há nenhuma ação cadastrada nesse contexto para essa atividade.`)
            }
        });
    } else {
        ctx.replyWithHTML(`Não há nenhuma ação cadastrada para essa atividade.`)
    }

    //A ação deve verificar se a nota está dentro dos paramentros

});

bot.action(/yesQuizLessonComplete (.+)/, async ctx => {
    action = await getAction(ctx.match[1]);
   
    ctx.replyWithHTML(`<b>Muito bem! Aqui está uma tarefa deixada pelo seu professor que vai servir de revisão. 
    \nTrata-se de um ${task.type} que deve ser resolvido até o dia 20/04/2022.</b> \n\n
    ${task.content_url}`)
});

const confirmacaoHandlerRevisao = new Composer()
confirmacaoHandlerRevisao.action('s', async ctx => {

    action.listActions.filter(async item => {
        if(item.title === '')
            ctx.replyWithHTML(`<b>Muito bem! Aqui está uma tarefa deixada pelo seu professor que vai servir de revisão.</b> 
            \nTrata-se de um ${item.title} que deve ser resolvido até o dia ${moment(item.dt_complete_class).format('YYYY-MM-DD')}.\n\n
                ${item.content_url}`)
            });
    ctx.scene.leave();
});

confirmacaoHandlerRevisao.action('s_quiz', ctx => {
    action.listActions.filter(async item => {
        ctx.replyWithHTML(`<b>Muito bem! Aqui está um QUIZ deixada pelo seu professor que vai servir para aprimorar seus conhecimentos.</b> 
            ${item.content_url}`)
        });
    ctx.scene.leave();
});

//alterar aqui
confirmacaoHandlerRevisao.action('s_resp_quiz', async ctx => {
    action.filter(async item => {
        ctx.replyWithHTML(`<b>Muito bem! Aqui está um QUIZ deixada pelo seu professor que vai servir para aprimorar seus conhecimentos.</b> 
            ${item.content_url}`)
        });
    ctx.scene.leave();
});

confirmacaoHandlerRevisao.action('s_quiz_task', async ctx => {
    action.filter(async item => {
        ctx.replyWithHTML(`<b>Muito bem! Aqui está um QUIZ deixada pelo seu professor que vai servir para aprimorar seus conhecimentos.</b> 
            ${item.content_url}`)
        });
    ctx.scene.leave();
});

confirmacaoHandlerRevisao.action('yes_complete', async ctx => {
    ctx.replyWithHTML(`Muito bem! Aqui está um <b>${action[0].title}</b> deixado(a) pelo seu professor que vai servir para aprimorar seus conhecimentos. 
\n${action[0].content_url}`);
    ctx.scene.leave();
});

confirmacaoHandlerRevisao.action('n', ctx => {
    ctx.reply('Tudo bem! Qualquer coisa é só utilizar os comandos citados acima.')
    ctx.scene.leave()
});

const wizardRevisao = new WizardScene('revisao',
    async ctx => {  
        subjects = await getSubjects();
        typeBot = 'REVISAO';
        //mostra as disciplinas as quais o aluno está matriculado - - REVISAO 1/1
        
        if(student) {
            ctx.reply(`Qual disciplina você quer falar?`, botoesSubject(subjects))
            taskStudent = await getTaskByStudent(student.id)
            ctx.wizard.next();
        } else {
            ctx.reply(`Antes de continuar, preciso da sua matricula. Clique para fazer /login`);
            ctx.scene.leave() 
        }
    },
    confirmacaoHandlerRevisao,
);
wizardRevisao.leave();
wizardRevisao.command('sair_revisao', leave());
/*---------------------------------REVISAO FIM -------------------------------*/


/*---------------------------------RECOMENDACAO INICIO -----------------------*/
const wizardRecomendacao = new WizardScene('recomendacao',
    async ctx => {  
        subjects = await getSubjects();
        typeBot = 'RECOMENDACAO';
      
        if (student) {
            ctx.reply(`Qual disciplina você quer falar?`, botoesSubject(subjects));
            ctx.wizard.next()
        } else {
            ctx.reply(`Antes de continuar, preciso da sua matricula. Clique para fazer /login`);
            ctx.scene.leave()
        }
    },
   
);

wizardRecomendacao.leave();
wizardRecomendacao.command('sair_recomendacao', leave());
/*---------------------------------RECOMENDACAO INICIO -----------------------*/


/*-------------------------------INICIO PRIMEIRO ACESSO-----------------------*/
const inicioHandler = new Composer()
inicioHandler.hears(/[A-z0-9]/, ctx => {
    matricula = ctx.update.message.text
    ctx.reply(`Confirmar?`, confirmacao)
    ctx.wizard.next()
});

const confirmacaoInicioHandler = new Composer()
confirmacaoInicioHandler.action('s', async ctx => {
    
    const data = {code_access: idUser};

    try {
        await insertCodeAccess(data, matricula);

        ctx.reply(`Login confirmado!\n
Em que posso ajudá-lo?\n
📖 Para revisão entre /revisao
📚 Para recomendação de conteúdos entre com /recomendacao\n `)

        ctx.scene.leave()
    } catch (error) {
        ctx.reply('Não foi possivel relizar o login. Por favor, verifique os dados e tente novamente. /login')
        ctx.scene.leave()
        console.log(error)
    }
});

confirmacaoInicioHandler.action('n', ctx => {
    ctx.reply('Tudo bem! Você pode entrar novamente.')
    ctx.scene.leave()
});

const wizardInicio = new WizardScene('iniciar',
    ctx => {
        ctx.reply('Qual sua matricula?')
        ctx.wizard.next()
    },
    inicioHandler,
    confirmacaoInicioHandler
)
wizardInicio.leave();
wizardInicio.command('sair_do_login', leave())
/*-------------------------------FIM PRIMEIRO ACESSO -------------------------*/
/*-------------------------------LOGIN INICIO --------------------------------*/
const loginHandler = new Composer()
loginHandler.hears(/[A-z0-9]/, ctx => {
    matricula = ctx.update.message.text
    ctx.reply(`Confirmar?`, confirmacao)
    ctx.wizard.next()
});

const confirmacaoLoginHandler = new Composer()
confirmacaoLoginHandler.action('s', async ctx => {
    student = await login(matricula);

    if (student) {
    ctx.reply(`Bem-vindo, ${student.name}!\n
Em que posso ajudá-lo?\n
📖 Para revisão entre /revisao
📚 Para recomendação de conteúdos entre com /recomendacao\n `)
        ctx.scene.leave()
    } else {
        ctx.reply('Não foi possivel relizar o login. Por favor, verifique os dados e tente novamente. /login')
        ctx.scene.leave()
    }
});

confirmacaoLoginHandler.action('n', ctx => {
    ctx.reply('Tudo bem! Você pode entrar novamente.')
    ctx.scene.leave()
});

const wizardLogin = new WizardScene('login',
    ctx => {
        ctx.reply('Qual sua matricula?')
        ctx.wizard.next()
    },
    loginHandler,
    confirmacaoLoginHandler
);
wizardLogin.leave();
wizardLogin.command('sair_do_inicio', leave());
/*-------------------------------LOGIN FIM -----------------------------------*/

const confirmacaoMonitoramento = Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton('Sim',`reponder`),
    Markup.callbackButton('Não', 'n'),
]));

/*-------------------------------PRIORIDADES ---------------------------------*/
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
/*-------------------------------PRIORIDADES ---------------------------------*/
let feed;
// const confirmacaoHandlerMonitoramento = new Composer()
// confirmacaoHandlerMonitoramento.action('resposta', async ctx => {
//     ctx.reply('Teste monitoramento.')
// });

/*-------------------------------INICIO DO PROGRAMA --------------------------*/
const stage = new Stage([wizardRecomendacao, wizardRevisao, wizardMonitoramento, wizardLogin, wizardInicio])
bot.use(session())
bot.use(stage.middleware())
bot.command('revisao', enter('revisao'))
bot.command('recomendacao', enter('recomendacao'))
bot.command('reponder', enter('reponder'))
bot.command('iniciar', enter('iniciar'))
bot.command('login', enter('login'))
//fallback
bot.on('message', ctx => ctx.reply(`Desculpe, não compreendi.🙁 Você pode tentar outro comandos: \n
🔓 Para primeiro acesso entre com /login
📖 Para revisão entre /revisao
📚 Para recomendação de conteúdos entre com /recomendacao`))

stage.action('reponder');

//notificar todos os alunos cadastrados
//1-
async function notificar () {
   const listStudent = await getStudents();

   listStudent.map((student) => {
        telegram.sendMessage(student.code_access, `Bom dia! Quais são suas prioridades para está semana? Gostaria de responder agora?`, confirmacaoMonitoramento);
        //telegram.sendMessage(student.code_access, `Bom dia! Quais são suas prioridades para está semana? Gostaria de responder agora? /reponder`);
    });
};

//const s = 10;

//const notificacao = new schedule.scheduleJob(`*/${s} * * * * *`, notificar)
//2-
// / = new schedule.scheduleJob(`15 59 6 * * 1-5`, notificar)

//Para a ação: Se nota >= ? em uma atividade x da aula invertida e não concluiu a aula invertida e se passaram pelo menos ? dias da data de entrega.
//Executar um schedule todo os dias da semana, as 9 horas da manha para verificar se deve entrega alguma atividade
async function acaoRevisaoEstudoIncompleto () {
    const list_actions = await getActions();

    const ListStudentTask = await getTaskByStudentStatus();
    
    //lista de açoes
    list_actions.listActions.map(action => {
        //se for do tipo Revisão para estudo incompleto
       if(action.category_action.name === 'Revisão para estudo incompleto') {
    
        //verfica se tem algum aluno apto a receber a msg do bot
        ListStudentTask.map(studentTask => {
            //converte a quantidade de dias configurada na ação para uma data
            var dtTask = moment(studentTask.created_at).format('YYYY-MM-DD');
            const dtEntregaBot = moment(dtTask).add(Number.parseInt(action.deadline), 'days'); 

            //verifica se os dias que o professor configurou é a data atual
            var today = new Date();
            if( moment(dtEntregaBot).format('YYYY-MM-DD') === moment(today).format('YYYY-MM-DD') && studentTask.status === 'PENDENTE') {
                //entrega do conteudo configurado
                telegram.sendMessage(studentTask.student.code_access, `Bom dia! Responda essa atividade.\n${action.content_url} `);
            }
        });
       }
    })
 };

  //listar as tasks da acao para ver usa data de criacao
 
    // listStudent.map((student) => {
    //      telegram.sendMessage(student.code_access, `Bom dia! Quais são suas prioridades para está semana? Gostaria de responder agora?`, confirmacaoMonitoramento);
    //      //telegram.sendMessage(student.code_access, `Bom dia! Quais são suas prioridades para está semana? Gostaria de responder agora? /reponder`);
    //  });

//teste
const notificacao = new schedule.scheduleJob(`0 0 9 * * *`, acaoRevisaoEstudoIncompleto)

//scheduler que verifica diariamente às 9 horas de segunda a sexta-feira se deve entregar o conteudo da acaoRevisaoEstudoIncompleto
//const notificacao = new schedule.scheduleJob(`0 0 9 * * 1-5`, acaoRevisaoEstudoIncompleto)

bot.startPolling();

module.exports = app;