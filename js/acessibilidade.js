(function () {
  "use strict";

  var raiz = document.documentElement;
  var CHAVE = "acessivel-preferencias";

  function carregar() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
  }
  function salvar(p) {
    try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) {}
  }
  var pref = carregar();

  var aviso = document.getElementById("aviso-status");
  function anunciar(texto) {
    if (!aviso) return;
    aviso.textContent = "";
    setTimeout(function () { aviso.textContent = texto; }, 60);
  }

  var ESCALAS = [0.9, 1, 1.15, 1.3, 1.5];
  function aplicarEscala() {
    var i = typeof pref.escala === "number" ? pref.escala : 1;
    raiz.style.setProperty("--escala", ESCALAS[i]);
  }

  var ALTERNAVEIS = {
    "alto-contraste": "Alto contraste",
    "espacamento": "Espaçamento ampliado",
    "destacar-links": "Destaque de links"
  };
  function aplicarClasses() {
    Object.keys(ALTERNAVEIS).forEach(function (cls) {
      var ativo = !!pref[cls];
      raiz.classList.toggle(cls, ativo);
      var b = document.querySelector('[data-alternar="' + cls + '"]');
      if (b) b.setAttribute("aria-pressed", String(ativo));
    });
  }

  aplicarEscala();
  aplicarClasses();

  document.addEventListener("click", function (ev) {
    var alvo = ev.target.closest("button");
    if (!alvo) return;

    if (alvo.dataset.fonte) {
      var i = typeof pref.escala === "number" ? pref.escala : 1;
      if (alvo.dataset.fonte === "mais") i = Math.min(i + 1, ESCALAS.length - 1);
      if (alvo.dataset.fonte === "menos") i = Math.max(i - 1, 0);
      pref.escala = i;
      aplicarEscala(); salvar(pref);
      anunciar("Tamanho do texto: " + Math.round(ESCALAS[i] * 100) + " por cento");
    }

    if (alvo.dataset.alternar) {
      var cls = alvo.dataset.alternar;
      pref[cls] = !pref[cls];
      aplicarClasses(); salvar(pref);
      anunciar(ALTERNAVEIS[cls] + (pref[cls] ? " ativado" : " desativado"));
    }

    if (alvo.id === "restaurar") {
      pref = {};
      aplicarEscala(); aplicarClasses(); salvar(pref);
      anunciar("Configurações de acessibilidade restauradas");
    }
  });

  var botaoMenu = document.getElementById("botao-menu");
  var menu = document.getElementById("menu-principal");
  if (botaoMenu && menu) {
    var mq = window.matchMedia("(max-width: 760px)");
    function ajustarMenu() {
      var fechado = mq.matches;
      menu.dataset.aberto = String(!fechado);
      botaoMenu.setAttribute("aria-expanded", String(!fechado));
    }
    ajustarMenu();
    mq.addEventListener ? mq.addEventListener("change", ajustarMenu) : mq.addListener(ajustarMenu);

    botaoMenu.addEventListener("click", function () {
      var aberto = botaoMenu.getAttribute("aria-expanded") === "true";
      botaoMenu.setAttribute("aria-expanded", String(!aberto));
      menu.dataset.aberto = String(!aberto);
    });

    menu.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && mq.matches) {
        botaoMenu.setAttribute("aria-expanded", "false");
        menu.dataset.aberto = "false";
        botaoMenu.focus();
      }
    });
  }

  var botaoOuvir = document.getElementById("ouvir");
  var botaoParar = document.getElementById("parar-leitura");
  if (botaoOuvir) {
    if (!("speechSynthesis" in window)) {
      botaoOuvir.disabled = true;
      botaoOuvir.textContent = "Leitura em voz alta indisponível neste navegador";
      if (botaoParar) botaoParar.hidden = true;
    } else {
      botaoOuvir.addEventListener("click", function () {
        var artigo = document.querySelector("[data-leitura]");
        if (!artigo) return;
        speechSynthesis.cancel();

        var partes = artigo.querySelectorAll("h1, h2, h3, p, li, figcaption, td, th");
        var texto = Array.prototype.map.call(partes, function (el) { return el.innerText; }).join(". ");
        var fala = new SpeechSynthesisUtterance(texto);
        fala.lang = "pt-BR";
        fala.rate = 1;
        var vozes = speechSynthesis.getVoices().filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
        if (vozes.length) fala.voice = vozes[0];
        fala.onend = function () { botaoOuvir.setAttribute("aria-pressed", "false"); };
        botaoOuvir.setAttribute("aria-pressed", "true");
        speechSynthesis.speak(fala);
        anunciar("Leitura iniciada");
      });
      if (botaoParar) {
        botaoParar.addEventListener("click", function () {
          speechSynthesis.cancel();
          botaoOuvir.setAttribute("aria-pressed", "false");
          anunciar("Leitura interrompida");
        });
      }
      window.addEventListener("beforeunload", function () { speechSynthesis.cancel(); });
    }
  }

  var form = document.getElementById("form-contato");
  if (form) {
    var resumo = document.getElementById("resumo-erros");
    var listaErros = document.getElementById("lista-erros");
    var status = document.getElementById("status-envio");

    var regras = {
      nome: function (v) { return v.trim().length >= 3 ? "" : "Informe seu nome com pelo menos 3 letras."; },
      email: function (v) {
        if (!v.trim()) return "Informe seu e-mail.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Escreva o e-mail no formato nome@exemplo.com.";
      },
      assunto: function (v) { return v ? "" : "Escolha um assunto."; },
      mensagem: function (v) { return v.trim().length >= 10 ? "" : "Escreva uma mensagem com pelo menos 10 caracteres."; }
    };

    function validarCampo(campo) {
      var erro = regras[campo.name] ? regras[campo.name](campo.value) : "";
      var saida = document.getElementById("erro-" + campo.name);
      campo.setAttribute("aria-invalid", erro ? "true" : "false");
      if (saida) saida.textContent = erro;
      return erro;
    }

    Object.keys(regras).forEach(function (nome) {
      var campo = form.elements[nome];
      campo.addEventListener("blur", function () { if (campo.value) validarCampo(campo); });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      status.textContent = "";
      listaErros.innerHTML = "";
      var primeiro = null;

      Object.keys(regras).forEach(function (nome) {
        var campo = form.elements[nome];
        var erro = validarCampo(campo);
        if (erro) {
          if (!primeiro) primeiro = campo;
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "#" + campo.id;
          a.textContent = erro;
          a.addEventListener("click", function (e) { e.preventDefault(); campo.focus(); });
          li.appendChild(a);
          listaErros.appendChild(li);
        }
      });

      if (primeiro) {
        resumo.hidden = false;
        resumo.focus();
      } else {
        resumo.hidden = true;
        form.reset();
        Object.keys(regras).forEach(function (n) { form.elements[n].removeAttribute("aria-invalid"); });
        status.textContent = "Mensagem enviada. Obrigado por contribuir com o site!";
        status.focus();
      }
    });
  }

  var DESTINOS = { 1: "conteudo", 2: "menu-principal", 3: "barra-acessibilidade", 4: "rodape" };
  document.addEventListener("keydown", function (ev) {
    if (!ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var m = /^(?:Digit|Numpad)([1-4])$/.exec(ev.code || "");
    if (!m) return;
    var alvo = document.getElementById(DESTINOS[m[1]]);
    if (!alvo) return;
    ev.preventDefault();
    if (m[1] === "2" && botaoMenu && botaoMenu.getAttribute("aria-expanded") === "false") {
      botaoMenu.click();
    }
    alvo.focus({ preventScroll: true });
    alvo.scrollIntoView({ block: "start" });
  });

  var ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
})();
