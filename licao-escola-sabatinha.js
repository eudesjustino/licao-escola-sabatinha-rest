var express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');

const app = express();

const urlLicaoAduto = "https://mais.cpb.com.br/licao-adultos/";

const urlLicaoJovens = "https://mais.cpb.com.br/licao-jovens/";

const dias = (() => {
    return {
        DOMINGO: "licaoDomingo",
        SEGUNDA: "licaoSegunda",
        TERCA: "licaoTerca",
        QUARTA: "licaoQuarta",
        QUINTA: "licaoQuinta",
        SEXTA: "licaoSexta",
        SABADO: "licaoSabado"

    }
})();

let licao = async (url, licaoFunc) => {    

    return new Promise((resolve, reject) => {
        request(url, async (error, response, html) => {
            if (!error) {                 
                let descricoesLicao = await licaoFunc(cheerio.load(html));                
                let dados = [];            
                for (let index = 0; index < descricoesLicao.length; index++) {
                    const element = descricoesLicao[index];
                    let licao = await procurarLicao(element.link)
                    dados.push({...element,"licoes":licao});                             
                } 
                resolve(dados);        
            }else{
                reject(error)
            }        
        });
    });   
}

let procurarLicao = async (url) => {
  
    return new Promise((resolve, reject) => {
        request(url, (error, response, html) => {
            if (!error && response.statusCode == 200) {
                let data = [];
                const semana = [dias.SABADO, dias.DOMINGO, dias.SEGUNDA,
                dias.TERCA, dias.QUARTA, dias.QUINTA, dias.SEXTA];                  
                var $ = cheerio.load(html);               
                semana.forEach(async (dia) => {                 
                    data.push(await extrairDados($, dia))                    
                });                
                resolve(data)
            } else {
                reject(error);
            }
        });
    });
}

let extrairDados = (html, dia) => {    
    let dados = {};        
    if (dia === dias.SABADO) {
        dados['dataDia'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class*=diaSabadoLicao]').text().trim();
        dados['titulo'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class|=titleLicao]').text().trim();
        dados['versoMemorizar'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class=versoMemorizar]').text().trim();
        
    } else {
        dados['dataDia'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class|=descriptionText]').text().trim();
        dados['titulo'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class|=titleLicaoDay]').text().trim();
        let rodape = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class*=rodapeBoxLicaoDia]').text().trim();
        if(rodape== false){
            rodape = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class=rodapeLicaoDia]').text().trim(); 
        }
        dados['rodape'] = rodape;
    }
    dados['conteudo']=[];    
    html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class*=conteudoLicaoDia]').find('p').each(function (i) {
        dados['conteudo'].push(html(this).text().trim());
    });    
    dados['anoBiblico'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class*=anoBiblicoDia]').text().trim();  
    dados['linkAudio'] = html(`div[class~=mdl-tabs__panel][id=${dia}]`).find('[class=audioLicaoDia]').find('audio').attr('src');

    return dados;
}

let licaoCorrente = (html) => {
    return JSON.parse(html("div[class*='cpbCards']").children("licao-corrente").text());
}

let licoesPrimeiroTrimestre = (html) => {
    return JSON.parse(html("div[class*='cpbCards']").children("[trimestre|='Trimestre 1']").text());
}

let licoesSegundoTrimestre = (html) => {
    return JSON.parse(html("div[class*='cpbCards']").children("[trimestre|='Trimestre 2']").text());
}

let licoesTerceiroTrimestre = (html) => {
    return JSON.parse(html("div[class*='cpbCards']").children("[trimestre|='Trimestre 3']").text());
}

let licoesQuartoTrimestre = (html) => {
    return JSON.parse(html("div[class*='cpbCards']").children("[trimestre|='Trimestre 4']").text());
}

app.get('/licao/aduto/corrente',async function (req, res) {     
    res.send(await licao(urlLicaoAduto,licaoCorrente));
});

app.get('/licao/aduto/primeirotrimeste', async function (req, res) {
    res.send(await licao(urlLicaoAduto,licoesPrimeiroTrimestre))
});

app.get('/licao/aduto/segundotrimeste', async function (req, res) {
    res.send(await licao(urlLicaoAduto,licoesSegundoTrimestre))
});

app.get('/licao/aduto/terceirotrimeste', async function (req, res) {
    res.send(await licao(urlLicaoAduto,licoesTerceiroTrimestre))
});

app.get('/licao/jovens/corrente', async function (req, res) {
    res.send(await licao(urlLicaoJovens,licaoCorrente))
});

app.listen('8081')

console.log('Executando raspagem de dados na porta 8081...');
