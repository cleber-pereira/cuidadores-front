(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function init() {
    const supabase = window.supabase.createClient(
      'https://duoobpxovvpxfgvvghgk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1b29icHhvdnZweGZndnZnaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDcyMjMsImV4cCI6MjA4OTY4MzIyM30.NcqCsxqs-1LeS6RLb_UbLv7AmehsgrRJqTnEcthSEY8'
    );

    let perfilAtual = null;
    let currentUserRole = null; // 'cuidador' ou 'usuario'

    // Vistas 
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    const metricas = urlParams.get('metricas');
    const local = window.location.href.indexOf('127.0.0.1') != -1;

    // ATUALIZAÇÃO DE VISITAS (DESATIVADO TEMPORARIAMENTE - reativar quando necessário)
    /*
    if (metricas != '1' && !local) {
      console.log('metric')
      const { data, error: errorSelect } = await supabase
        .from('c_metricas')
        .select('visitas')
        .eq('id', 1)
        .single();

      if (!errorSelect) {
        const res = await fetch('https://api.ipify.org?format=json');
        const { ip } = await res.json();
        async function registrarVisita() {
          const { error } = await supabase
            .from('c_metricas')
            .update({
              visitas: data.visitas + 1,
              ultimo_ip: ip
            })
            .eq('id', 1);
        }
        callMeBot('Visitante => IP: ' + ip)
        registrarVisita();
      }
    }
    */

    setTimeout(() => {
      // Inicialização e estado de autenticação
      try { const { data: { session } } = supabase.auth.getSession() } catch (e) { }

      try {
        updateAuthUI(session?.user ?? null);
      } catch (error) { }

      /*  try {
         if (session?.user) redirecionarAposLogin(session.user);
         supabase.auth.onAuthStateChange(async (event, session) => {
           updateAuthUI(session?.user ?? null);
           if (event === 'SIGNED_IN' && session?.user) redirecionarAposLogin(session.user);
         });
       } catch (error) {} */
    }, 7000);
    function nomePublico(nome) {
      if (!nome) return '';
      const conectivos = ['da', 'de', 'do', 'das', 'dos', 'e'];
      const partes = nome.trim().split(/\s+/);
      const grupos = [];
      let buffer = '';
      for (const parte of partes) {
        if (conectivos.includes(parte.toLowerCase())) {
          buffer += (buffer ? ' ' : '') + parte;
        } else {
          grupos.push(buffer ? `${buffer} ${parte}` : parte);
          buffer = '';
        }
      }
      if (buffer) {
        if (grupos.length) grupos[grupos.length - 1] += ` ${buffer}`;
        else grupos.push(buffer);
      }
      return grupos.slice(0, 2).join(' ');
    }

    function slugNome(nome) {
      if (!nome) return '';
      return nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-'); // substitui espaços (um ou mais) por traço
    }

    function stars(n) {
      n = n || 5;
      let s = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(n)) s += '<i class="bi bi-star-fill"></i>';
        else if (i === Math.ceil(n) && n % 1 >= 0.25) s += '<i class="bi bi-star-half"></i>';
        else s += '<i class="bi bi-star"></i>';
      }
      return s;
    }

    function showToast(msg, type = 'success') {
      const el = document.getElementById('toast-ok');
      el.className = `toast align-items-center text-bg-${type} border-0`;
      document.getElementById('toast-msg').innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'} me-2"></i>${msg}`;
      new bootstrap.Toast(el, { delay: 3500 }).show();
    }

    // Exibe uma lista com TODOS os erros de validação encontrados na tentativa
    // de envio, em vez de mostrar apenas o primeiro problema encontrado.
    function showToastErros(erros, titulo = 'Corrija os campos abaixo:') {
      if (!erros || !erros.length) return;
      const el = document.getElementById('toast-ok');
      el.className = `toast align-items-center text-bg-danger border-0`;
      const listaHtml = erros.map(e => `<li>${e}</li>`).join('');
      document.getElementById('toast-msg').innerHTML =
        `<i class="bi bi-exclamation-circle-fill me-2"></i>${titulo}` +
        `<ul class="mb-0 ps-3 mt-1">${listaHtml}</ul>`;
      // Tempo maior para dar tempo de ler vários erros de uma vez
      new bootstrap.Toast(el, { delay: 3500 + erros.length * 1200 }).show();
    }

    // ===================================================================
    // Validações de campos — cada função valida UM único campo e retorna
    // a mensagem de erro correspondente (string) ou null quando está OK.
    // Mantê-las separadas facilita reaproveitar as mesmas regras entre o
    // cadastro e a edição, além de deixar claro qual regra falhou.
    // ===================================================================
    function validarNome(nome) {
      if (!nome || !nome.trim()) return 'Informe o nome.';
      if (nome.trim().length < 2) return 'O nome deve ter pelo menos 2 caracteres.';
      return null;
    }

    function validarSobrenome(sobrenome) {
      if (!sobrenome || !sobrenome.trim()) return 'Informe o sobrenome.';
      return null;
    }

    function validarAreaAtuacao(areaAtuacao) {
      if (!areaAtuacao || !areaAtuacao.length) return 'Selecione ao menos uma área de atuação.';
      return null;
    }

    function validarCidade(cidade) {
      if (!cidade) return 'Selecione a cidade.';
      return null;
    }

    function validarWhatsapp(whatsapp) {
      if (!whatsapp) return 'Informe o número de WhatsApp.';
      if (whatsapp.length < 10 || whatsapp.length > 11) return 'Informe um WhatsApp válido, com DDD (10 ou 11 dígitos).';
      // Com 10 dígitos, o número após o DDD não pode começar com 9 —
      // números que começam com 9 são celulares e precisam do 9º dígito,
      // totalizando 11 dígitos (ex.: (61) 9999-9999 é inválido, deveria
      // ser (61) 99999-9999).
      if (whatsapp.length === 10 && whatsapp[2] === '9') return 'Número inválido: celulares que começam com 9 precisam ter 11 dígitos (DDD + 9 + 8 números).';
      return null;
    }

    function validarPreco(preco) {
      if (preco === undefined || preco === null || isNaN(preco)) return 'Informe o preço do plantão.';
      if (preco !== -1 && preco <= 0) return 'O preço deve ser maior que zero (ou marque como "a combinar").';
      return null;
    }

    function validarSobre(sobre) {
      if (!sobre || !sobre.trim()) return 'Preencha o campo "Sobre você".';
      if (sobre.trim().length < 20) return 'O campo "Sobre você" deve ter pelo menos 20 caracteres.';
      return null;
    }

    function validarFoto(file) {
      if (file && file.size > 500 * 1024) return 'A foto deve ter no máximo 500 KB.';
      return null;
    }

    // Executa uma lista de funções de validação (cada uma retornando erro ou null)
    // e devolve apenas as mensagens de erro que realmente ocorreram.
    function coletarErros(validacoes) {
      return validacoes.filter(Boolean);
    }

    function expToAnos(str) {
      const m = (str || '').match(/\d+/);
      return m ? parseInt(m[0]) : 0;
    }

    async function callMeBot(text) {
      const url = `https://api.callmebot.com/whatsapp.php?source=php&phone=556193872684&apikey=977206&text=${text}`;
      fetch(url);
    }

    queryString = window.location.search;
    urlParams = new URLSearchParams(queryString);
    const alias = urlParams.get('alias');
    const vagaAliasParam = urlParams.get('vaga');

    if (alias != null) {
      obterAlias();
    }
    if (vagaAliasParam != null) {
      obterVagaPorAlias(vagaAliasParam);
    }

    // Resolve o link amigável de uma vaga (?vaga=slug-do-titulo-id) para o registro real
    // e abre a modal de detalhes, do mesmo jeito que obterAlias() faz para perfis de cuidador.
    async function obterVagaPorAlias(aliasParam) {
      const { data, error } = await supabase
        .from('c_vagas')
        .select('id,titulo')
        .eq('ativa', true);

      if (error) {
        console.error('Erro:', error);
        showToast('Não foi possível carregar a vaga.', 'danger');
        return;
      }

      const resultado = (data || []).map(item => {
        const segundaParteId = item.id.split('-')[1] || item.id;
        return {
          ALIAS: `${slugNome(item.titulo)}-${segundaParteId}`,
          IDENTIFICADOR: item.id
        };
      });

      const aliasEspecifico = resultado.find(item => item.ALIAS === aliasParam);

      if (!aliasEspecifico) {
        showToast('Vaga não encontrada ou não está mais disponível.', 'warning');
        return;
      }

      goTo('vagas');
      await carregarVagas();
      abrirVagaModal(aliasEspecifico.IDENTIFICADOR);
    }

    async function obterAlias() {
      const { data, error } = await supabase
        .from('c_cuidadores')
        .select(`id,nome,c_cuidador_visitas!inner (id)`)

      if (error) {
        console.error('Erro:', error)
        return []
      }

      // Processar os dados para criar o ALIAS
      // ALIAS = nome sem acentos (espaços viram traços) + segunda parte do id (dividido por "-")
      const resultado = data.map(item => {
        const segundaParteId = item.id.split('-')[1] || item.id;
        return {
          ALIAS: `${slugNome(item.nome)}-${segundaParteId}`,
          IDENTIFICADOR: item.id,
          // NOME: item.nome
        };
      })
      const aliasEspecifico = resultado.find(item => item.ALIAS === alias)

      // Ordenar por ALIAS
      resultado.sort((a, b) => a.ALIAS.localeCompare(b.ALIAS))

      if (aliasEspecifico) {
        const { data: cuidadorAtualizado, error: erroCuidador } = await supabase.from('c_cuidadores').select('*').eq('id', aliasEspecifico.IDENTIFICADOR).single();

        if (erroCuidador || !cuidadorAtualizado) {
          showToast('Perfil não encontrado', 'danger');
          return;
        }

        if (cuidadorAtualizado.disponivel !== true) {
          goTo('indisponivel');
          return;
        }

        perfilAtual = cuidadorAtualizado;
        goTo('perfil');
      } else {
        showToast('Perfil não encontrado', 'danger');
      }
    }

    async function updateAuthUI(user) {
      // const loginBtn = document.getElementById('login-button');
      const userInfo = document.getElementById('user-info');
      const userRoleSpan = document.getElementById('user-role');
      if (user) {
        //   loginBtn.classList.remove('d-md-inline-flex');
        document.getElementById('logout-button').style.display = 'block';
        //   loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';

        // Determinar papel (cuidador ou usuario)
        const { data: cuidador } = await supabase.from('c_cuidadores').select('id').eq('id', user.id).single();
        if (cuidador) {
          currentUserRole = 'cuidador';
          userRoleSpan.textContent = 'Perfil';
          userRoleSpan.className = 'badge bg-success text-white';
          userRoleSpan.style.cursor = 'pointer';
          userRoleSpan.title = 'Editar meu perfil';
          userRoleSpan.onclick = async () => {
            const perfil = await verificarPerfilAtivo(user.id);
            if (perfil) {
              await preencherFormularioEdicao(perfil);
              goTo('editar');
            }
          };
          document.getElementById('nav-cadastro').classList.add('d-md-inline-flex');
          document.getElementById('nav-cadastro-usuario').classList.remove('d-md-inline-flex');
          // Apenas cuidadores possuem mensagens recebidas para visualizar.
          const navMensagens = document.getElementById('nav-mensagens');
          if (navMensagens) navMensagens.style.display = 'inline-flex';
          atualizarBadgeMensagensNaoLidas(user.id);
        } else {
          const { data: usuario } = await supabase.from('c_usuarios').select('id').eq('id', user.id).single();
          const navMensagens = document.getElementById('nav-mensagens');
          if (navMensagens) navMensagens.style.display = 'none';
          ocultarBadgeMensagens();
          if (usuario) {
            currentUserRole = 'usuario';
            userRoleSpan.textContent = 'Perfil';
            userRoleSpan.className = 'badge bg-info text-dark';
            userRoleSpan.style.cursor = '';
            userRoleSpan.title = '';
            userRoleSpan.onclick = null;
            document.getElementById('nav-cadastro').classList.remove('d-md-inline-flex');
            document.getElementById('nav-cadastro-usuario').classList.add('d-md-inline-flex');
          } else {
            currentUserRole = null;
            userRoleSpan.textContent = 'Sem perfil';
            userRoleSpan.className = 'badge bg-secondary';
            userRoleSpan.style.cursor = '';
            userRoleSpan.title = '';
            userRoleSpan.onclick = null;
          }
        }
      } else {
        //   loginBtn.classList.add('d-md-inline-flex');
        document.getElementById('logout-button').style.display = 'none';
        //   loginBtn.style.display = 'inline-flex';
        userInfo.style.display = 'none';
        currentUserRole = null;
        const navMensagens = document.getElementById('nav-mensagens');
        if (navMensagens) navMensagens.style.display = 'none';
        ocultarBadgeMensagens();
      }
    }

    // Consulta quantas mensagens não lidas o cuidador tem e atualiza o
    // badge numérico no ícone de envelope da navbar.
    async function atualizarBadgeMensagensNaoLidas(cuidadorId) {
      const badge = document.getElementById('mensagens-badge');
      if (!badge) return;
      const { count, error } = await supabase
        .from('c_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('cuidador', cuidadorId)
        .eq('lida', false);

      if (error) {
        console.error('Erro ao contar mensagens não lidas:', error);
        return;
      }

      if (count && count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Esconde e zera o badge (usado ao deslogar ou quando o usuário não é cuidador).
    function ocultarBadgeMensagens() {
      const badge = document.getElementById('mensagens-badge');
      if (!badge) return;
      badge.style.display = 'none';
      badge.textContent = '0';
    }

    // Autenticação
    async function fazerLogin(email, senha) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        showToast(error.message, 'danger');
        return false;
      }
      showToast('Login efetuado com sucesso!');
      fecharModalLogin();
      return true;
    }

    async function fazerCadastro(email, senha) {
      const { data, error } = await supabase.auth.signUp({ email, password: senha });
      if (error) {
        showToast(error.message, 'danger');
        return false;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        showToast('Usuário já existe. Faça login.', 'warning');
      } else {
        showToast('Conta criada! Verifique seu e-mail.');
        await fazerLogin(email, senha);
      }
      fecharModalLogin();
      return true;
    }

    async function loginWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname + '?intc=' + localStorage.getItem('intencao'),
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });

      updateAuthUI(session?.user ?? null);

      if (session?.user) redirecionarAposLogin(session.user);
      supabase.auth.onAuthStateChange(async (event, session) => {
        updateAuthUI(session?.user ?? null);
        if (event === 'SIGNED_IN' && session?.user) redirecionarAposLogin(session.user);
      });
      if (error) showToast('Erro ao iniciar login com Google: ' + error.message, 'danger');
    }

    async function fazerLogout() {
      await supabase.auth.signOut();
      document.getElementById('nav-cadastro').classList.add('d-md-inline-flex');
      document.getElementById('nav-cadastro-usuario').classList.add('d-md-inline-flex');
      document.getElementById('user-role').classList.add('d-none');
      showToast('Você saiu da conta.');
      updateAuthUI(null);
      if (document.getElementById('screen-cadastro').classList.contains('active')) goTo('home');
      if (document.getElementById('screen-editar').classList.contains('active')) goTo('home');
      if (document.getElementById('screen-cadastro-usuario').classList.contains('active')) goTo('home');
    }

    // Modal
    const modal = document.getElementById('loginModal');
    function abrirModalLogin(mensagem) {
      const googleBtn = document.getElementById('google-login');
      let msgEl = document.getElementById('login-modal-msg');
      if (mensagem) {
        if (!msgEl && googleBtn) {
          msgEl = document.createElement('p');
          msgEl.id = 'login-modal-msg';
          msgEl.className = 'text-muted small mb-3';
          googleBtn.parentNode.insertBefore(msgEl, googleBtn);
        }
        if (msgEl) {
          msgEl.textContent = mensagem;
          msgEl.style.display = 'block';
        }
      } else if (msgEl) {
        msgEl.style.display = 'none';
      }
      modal.style.display = 'flex';
    }
    function fecharModalLogin() { modal.style.display = 'none'; }

    //   document.getElementById('login-button').addEventListener('click', abrirModalLogin);
    document.getElementById('close-modal').addEventListener('click', fecharModalLogin);
    /* document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      if (!email || !pass) { showToast('Preencha e-mail e senha', 'danger'); return; }
      await fazerLogin(email, pass);
    });
    document.getElementById('btn-signup').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      if (!email || !pass) { showToast('Preencha e-mail e senha', 'danger'); return; }
      await fazerCadastro(email, pass);
    }); */
    document.getElementById('google-login').addEventListener('click', loginWithGoogle);
    document.getElementById('logout-button').addEventListener('click', fazerLogout);

    // Verificação de perfil (cuidador)
    async function verificarPerfilAtivo(userId) {
      const { data, error } = await supabase.from('c_cuidadores').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') { console.error('Erro ao verificar perfil:', error); return null; }
      return data;
    }

    async function redirecionarAposLogin(user) {
      if (!user) return;
      const vagaPendente = localStorage.getItem('candidaturaPendente');
      const perfil = await verificarPerfilAtivo(user.id);
      if (perfil) {
        if (vagaPendente) {
          localStorage.removeItem('candidaturaPendente');
          currentUserRole = 'cuidador';
          await candidatarAposLogin(vagaPendente);
          return;
        }
        await preencherFormularioEdicao(perfil);
        goTo('editar');
      } else {
        // Verifica se é usuário comum
        const { data: usuario } = await supabase.from('c_usuarios').select('id', 'nome').eq('id', user.id).single();
        if (user) {
          if (vagaPendente) {
            // Cuidador ainda sem perfil: precisa completar o cadastro antes de poder se candidatar.
            showToast('Complete seu cadastro de cuidador para se candidatar a esta vaga.', 'info');
            goTo('cadastro');
            return;
          }
          // showToast('Bem-vindo de volta, ' + usuario.nome + '!');
          goTo('home');
        }
      }
    }

    // Após login vindo de uma candidatura pendente: abre a vaga e confirma o interesse automaticamente.
    async function candidatarAposLogin(vagaId) {
      document.querySelectorAll('.screen').forEach(el => {
        el.classList.remove('active', 'leaving');
        el.style.display = 'none';
      });
      const screenVagas = document.getElementById('screen-vagas');
      screenVagas.style.display = 'block';
      screenVagas.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      await carregarVagas();
      abrirVagaModal(vagaId);
      const btn = document.getElementById('vaga-modal-candidatar');
      if (btn && !btn.disabled) {
        await candidatarVaga(vagaId, btn);
      }
    }

    // Gera o link direto do perfil: nome sem acentos (espaços -> traço) + segunda parte do id
    function gerarLinkPerfil(perfil) {
      const segundaParteId = (perfil.id || '').split('-')[1] || perfil.id || '';
      const alias = `${slugNome(perfil.nome)}-${segundaParteId}`;
      return `${window.location.origin}${window.location.pathname}?alias=${alias}`;
    }

    // Gera o link direto de uma vaga: título sem acentos (espaços -> traço) + segunda parte do id
    function gerarLinkVaga(vaga) {
      const segundaParteId = (vaga.id || '').split('-')[1] || vaga.id || '';
      const alias = `${slugNome(vaga.titulo)}-${segundaParteId}`;
      return `${window.location.origin}${window.location.pathname}?vaga=${alias}`;
    }

    // Preencher tela de edição (cuidador)
    async function preencherFormularioEdicao(perfil) {
      const campoLink = document.getElementById('edit-link-perfil');
      const linkPerfil = gerarLinkPerfil(perfil);
      if (campoLink) campoLink.value = linkPerfil;
      const btnAcessar = document.getElementById('btn-acessar-link-perfil');
      if (btnAcessar) btnAcessar.href = linkPerfil;
      document.getElementById('edit-nome').value = perfil.nome || '';
      document.getElementById('edit-sobrenome').value = perfil.sobrenome || '';
      document.getElementById('edit-whatsapp').value = perfil.whatsapp || '';
      document.getElementById('edit-preco').value = perfil.preco || '';
      document.getElementById('edit-exp').value = perfil.experiencia || 'Menos de 1 ano';
      document.getElementById('edit-sobre').value = perfil.sobre || '';
      if (!todasCidades.length) await carregarCidades();
      montarChecklistCidades('edit-cidade-check', 'edit-cidade-filtro', 'edit-cidade-selecionadas');
      setCidadesSelecionadas('edit-cidade-check', 'edit-cidade-selecionadas', perfil.area_atuacao || []);
      const servicosArray = perfil.servicos || [];
      document.querySelectorAll('#edit-servicos-check input[type="checkbox"]').forEach(cb => {
        const label = cb.parentElement.textContent.trim();
        cb.checked = servicosArray.includes(label);
      });
      document.getElementById('edit-quero-verificacao').checked = perfil.quero_verificacao || false;
      if (perfil.foto_url) {
        const preview = document.getElementById('edit-foto-preview');
        preview.src = perfil.foto_url;
        preview.style.display = 'block';
        document.getElementById('edit-upload-icon').style.display = 'none';
        document.getElementById('edit-upload-label').innerHTML = 'Clique para alterar a foto';
      }
      window.perfilOriginalFoto = perfil.foto_url;
    }

    // Atualizar perfil cuidador
    async function atualizarPerfil(e) {
      if (e) e.preventDefault();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast('Você precisa estar logado.', 'warning'); abrirModalLogin(); return; }

      const nome = document.getElementById('edit-nome').value.trim();
      const area_atuacao = getCidadesSelecionadas('edit-cidade-check');
      const whatsapp = document.getElementById('edit-whatsapp').value.trim().replace(/\D/g, '');
      const preco = parseFloat(document.getElementById('edit-preco').value);
      const experiencia = document.getElementById('edit-exp').value;
      const sobre = document.getElementById('edit-sobre').value.trim();
      const quero_verificacao = document.getElementById('edit-quero-verificacao').checked;
      const servicos = Array.from(document.querySelectorAll('#edit-servicos-check input:checked')).map(el => el.parentElement.textContent.trim());
      const fotoInput = document.getElementById('edit-foto-input');

      const erros = coletarErros([
        validarNome(nome),
        validarAreaAtuacao(area_atuacao),
        validarWhatsapp(whatsapp),
        validarPreco(preco),
        validarSobre(sobre),
        validarFoto(fotoInput.files && fotoInput.files[0])
      ]);

      if (erros.length) {
        showToastErros(erros);
        return;
      }

      const btn = document.getElementById('btn-atualizar');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Atualizando...';

      try {
        const fotoAntigaUrl = window.perfilOriginalFoto || null;
        let foto_url = fotoAntigaUrl;
        if (fotoInput.files && fotoInput.files[0]) {
          const file = fotoInput.files[0];
          if (file.size > 500 * 1024) {
            showToast('A foto deve ter até 500 KB', 'danger');
            return;
          }
          const ext = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: upData, error: upErr } = await supabase.storage.from('fotos-cuidadores').upload(fileName, file, { contentType: file.type });
          if (upErr) throw new Error('Upload da foto: ' + upErr.message);
          const { data: urlData } = supabase.storage.from('fotos-cuidadores').getPublicUrl(upData.path);
          foto_url = urlData.publicUrl;

          // Apagar a foto antiga do storage (evita lixo acumulando no bucket).
          // Não apaga se a foto antiga era um dos avatares padrão (compartilhados entre usuários).
          const bucketPrefix = 'https://duoobpxovvpxfgvvghgk.supabase.co/storage/v1/object/public/fotos-cuidadores/';
          if (fotoAntigaUrl && fotoAntigaUrl.startsWith(bucketPrefix)) {
            const oldPath = fotoAntigaUrl.slice(bucketPrefix.length);
            if (oldPath && oldPath !== 'avatar-neutro.png' && oldPath !== 'avatar.png') {
              const { error: delErr } = await supabase.storage.from('fotos-cuidadores').remove([oldPath]);
              if (delErr) console.warn('Não foi possível apagar a foto antiga:', delErr.message);
            }
          }
        }

        // ATUALIZAÇÃO DE CUIDADOR (REATIVADO)
        const { error } = await supabase.from('c_cuidadores').update({
          nome, area_atuacao, whatsapp, preco, experiencia, sobre, servicos, quero_verificacao, foto_url
        }).eq('id', session.user.id);

        if (error) throw new Error(error.message);
        showToast('Perfil atualizado com sucesso!');
        goTo('lista');
      } catch (err) {
        console.error(err);
        showToast('Erro: ' + err.message, 'danger');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-2"></i>Atualizar Perfil';
      }
    }

    // Cadastro de usuário comum
    async function salvarCadastroUsuario() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast('Você precisa estar logado para se cadastrar como usuário.', 'warning'); abrirModalLogin(); return; }

      const nome = document.getElementById('user-nome').value.trim();
      const cidade = document.getElementById('user-cidade').value;
      const whatsapp = document.getElementById('user-whatsapp').value.trim().replace(/\D/g, '');
      const fotoInput = document.getElementById('user-foto-input');

      const erros = coletarErros([
        validarNome(nome),
        validarCidade(cidade),
        validarWhatsapp(whatsapp),
        validarFoto(fotoInput.files && fotoInput.files[0])
      ]);

      if (erros.length) {
        showToastErros(erros);
        return;
      }

      const btn = document.getElementById('btn-cadastrar-usuario');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cadastrando...';

      try {
        let foto_url = 'https://duoobpxovvpxfgvvghgk.supabase.co/storage/v1/object/public/fotos-cuidadores/avatar-neutro.png';
        if (fotoInput.files && fotoInput.files[0]) {
          const file = fotoInput.files[0];
          if (file.size > 500 * 1024) {
            showToast('A foto deve ter até 500 KB', 'danger');
            return;
          }
          const ext = file.name.split('.').pop();
          const fileName = `user_${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: upData, error: upErr } = await supabase.storage.from('fotos-usuarios').upload(fileName, file, { contentType: file.type });
          if (upErr) throw new Error('Upload da foto: ' + upErr.message);
          const { data: urlData } = supabase.storage.from('fotos-usuarios').getPublicUrl(upData.path);
          foto_url = urlData.publicUrl;
        }

        const { error } = await supabase.from('c_usuarios').insert([{
          id: session.user.id, nome, cidade, whatsapp, foto_url
        }]);
        if (error) throw new Error(error.message);
        showToast('Cadastro de usuário concluído!');
        goTo('home');
      } catch (err) {
        console.error(err);
        showToast('Erro: ' + err.message, 'danger');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Criar minha conta';
      }
    }

    // Renderização do perfil (cuidador)
    function renderPerfil(c) {
      const foto = c.foto_url || `https://duoobpxovvpxfgvvghgk.supabase.co/storage/v1/object/public/fotos-cuidadores/avatar-neutro.png`;
      document.getElementById('p-foto').src = foto;
      document.getElementById('p-nome').textContent = nomePublico(c.nome);
      const areaTexto = (Array.isArray(c.area_atuacao) && c.area_atuacao.length) ? c.area_atuacao.join(', ') : 'Área não informada';
      document.getElementById('p-local').innerHTML = `<i class="bi bi-briefcase me-1"></i>${c.experiencia} de experiência`;
      document.getElementById('p-area-intro').innerHTML = `<i class="bi bi-geo-alt me-1"></i>Atende em: ${areaTexto}`;
      document.getElementById('p-avaliacao').innerHTML = `${stars(c.avaliacao)} <span class="text-white ms-1 fw-600">${(c.avaliacao || 5).toFixed(1)}</span>`;
      document.getElementById('p-reviews').textContent = `(${c.total_reviews || 0} avaliações)`;
      if (c.preco !== -1) {
        document.getElementById('p-preco-dia').textContent = `Período integral: R$ ${(c.preco * 2).toFixed(0)}/dia`;
      }
      document.getElementById('p-preco').innerHTML = c.preco === -1 ? 'Valor a combinar' : `R$ ${c.preco}<small class="text-warning">/plantão</small>`;
      document.getElementById('p-sobre').textContent = c.sobre || 'Cuidador dedicado com experiência em acompanhamento e cuidados domiciliares.';
      document.getElementById('p-verificado').style.display = c.verificado ? '' : 'none';
      document.getElementById('p-disponivel').style.display = c.disponivel ? '' : 'none';
      document.getElementById('p-preco-cta').innerHTML = c.preco === -1 ? 'Sob consulta' : `R$ ${c.preco}<span class="text-muted" style="font-size:.75rem;font-family:'DM Sans'">/plantão</span>`;
      if (c.preco !== -1) {
        document.getElementById('p-preco-sidebar').innerHTML = `R$ ${c.preco}<small style="font-family:'DM Sans';font-size:.8rem;color:var(--muted);font-weight:400">/plantão</small>`;
        document.getElementById('p-preco-dia2').textContent = `R$ ${(c.preco * 2).toFixed(0)}/dia integral`;

      }
      const servicos = Array.isArray(c.servicos) ? c.servicos : [];
      document.getElementById('p-servicos').innerHTML = servicos.length ? servicos.map(s => `<span class="service-chip">${s}</span>`).join('') : '<span class="text-muted small">Não informado</span>';
      const areasAtuacao = Array.isArray(c.area_atuacao) ? c.area_atuacao : [];
      document.getElementById('p-area-atuacao').innerHTML = areasAtuacao.length ? areasAtuacao.map(a => `<span class="service-chip"><i class="bi bi-geo-alt me-1"></i>${a}</span>`).join('') : '<span class="text-muted small">Não informado</span>';
      carregarAvaliacoes(c.id);
      // clicksCuidadores(c.id); // ATUALIZAÇÃO DE VISITAS DESATIVADA TEMPORARIAMENTE - reativar quando necessário
    }

    // ATUALIZAÇÃO DE VISITAS DO CUIDADOR (DESATIVADO TEMPORARIAMENTE - reativar quando necessário)
    /*
    async function clicksCuidadores(id) {
      // Vistas 
      let queryString = window.location.search;
      let urlParams = new URLSearchParams(queryString);
      const metricas = urlParams.get('metricas');
      const local = window.location.href.indexOf('127.0.0.1') != -1;
      8
      if (metricas != '1' && !local) {
        const { data, error: errorSelect } = await supabase
          .from('c_cuidador_visitas')
          .select('id,visitas')
          .eq('cuidador', id)
          .single();

        if (!errorSelect) {
          const { error } = await supabase
            .from('c_cuidador_visitas')
            .update({
              visitas: data.visitas + 1
            })
            .eq('id', data.id);
        }
      }
    }
    */
    async function carregarAvaliacoes(id) {
      const el = document.getElementById('p-avaliacoes');
      el.innerHTML = '<div class="text-muted small">Carregando avaliações...</div>';
      const { data, error } = await supabase
        .from('c_avaliacoes')
        .select(`
            *,
            usuarios:c_usuarios (
                nome,
                foto_url
            )
            `)
        .eq('cuidador_id', id)
        .eq('disponivel', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error(error);
        el.innerHTML = '<div class="text-muted small">Erro ao carregar avaliações.</div>';
        return;
      }
      if (!data || data.length === 0) {
        el.innerHTML = '<div class="text-muted small">Ainda sem avaliações.</div>';
        return;
      }
      el.innerHTML = data.map(r => {
        const nome = r.usuarios?.nome || r.nome_cliente || 'Usuário';
        const foto = r.usuarios?.foto_url || `https://i.pravatar.cc/80?u=${encodeURIComponent(nome)}`;
        return `<div class="review-card">
            <div class="d-flex align-items-center gap-2 mb-2">
                <img src="${foto}" class="review-avatar" onerror="this.src='https://i.pravatar.cc/80'"/>
                <div>
                <div class="fw-600 small">${nome}</div>
                <div class="stars" style="font-size:.75rem">${stars(r.nota)}</div>
                </div>
                <span class="ms-auto text-muted" style="font-size:.75rem">${new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            <p class="small mb-0">${r.comentario || ''}</p>
            </div>`;
      }).join('');
    }

    // Avaliação
    const avaliacaoModal = document.getElementById('avaliacaoModal');
    let avaliacaoNota = 0;

    function abrirModalAvaliacao() {
      if (!currentUserRole) {
        showToast('Você precisa estar logado para avaliar.', 'warning');
        abrirModalLogin();
        return;
      }
      if (currentUserRole !== 'usuario') {
        showToast('Apenas usuários comuns podem avaliar cuidadores.', 'warning');
        return;
      }
      avaliacaoNota = 0;
      document.getElementById('avaliacao-nota').value = 0;
      document.getElementById('avaliacao-comentario').value = '';
      // Reset estrelas
      document.querySelectorAll('#rating-stars i').forEach(star => {
        star.classList.remove('active');
        star.classList.add('bi-star');
        star.classList.remove('bi-star-fill');
      });
      avaliacaoModal.style.display = 'flex';
    }

    function fecharModalAvaliacao() {
      avaliacaoModal.style.display = 'none';
    }

    async function enviarAvaliacao() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast('Você precisa estar logado.', 'warning'); fecharModalAvaliacao(); return; }
      if (avaliacaoNota === 0) { showToast('Selecione uma nota antes de enviar.', 'danger'); return; }

      const comentario = document.getElementById('avaliacao-comentario').value.trim();
      const cuidadorId = perfilAtual.id;

      // Buscar nome do usuário
      const { data: usuario } = await supabase.from('c_usuarios').select('nome').eq('id', session.user.id).single();
      if (!usuario) { showToast('Perfil de usuário não encontrado.', 'danger'); return; }

      const btn = document.getElementById('btn-enviar-avaliacao');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

      // Inserir avaliação (o trigger cuidará da atualização da soma e dos campos do cuidador)
      const { error: insertErr } = await supabase.from('c_avaliacoes').insert([{
        cuidador_id: cuidadorId,
        user_id: session.user.id,
        nome_cliente: usuario.nome,
        nota: avaliacaoNota,
        comentario: comentario,
        disponivel: false
      }]);

      if (insertErr) {
        showToast('Erro ao enviar avaliação: ' + insertErr.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = 'Enviar Avaliação';
        return;
      }

      // ATUALIZAÇÃO DE CUIDADOR - MÉDIA DE AVALIAÇÃO (DESATIVADO TEMPORARIAMENTE - reativar quando necessário)
      /*
      // Atualizar soma
      const { data: somaData } = await supabase
        .from('c_cuidadores')
        .select('avaliacao, total_reviews')
        .eq('id', cuidadorId)
        .single();

      if (somaData) {
        const novaSoma = 1 + somaData.total_reviews;
        const novaMedia = (somaData.avaliacao + avaliacaoNota) / novaSoma;
        const { error: somaErr } = await supabase
          .from('c_cuidadores')
          .update({
            avaliacao: novaMedia,
            total_reviews: novaSoma
          })
          .eq('id', cuidadorId);

        if (somaErr) {
          showToast('Erro ao enviar avaliação: ' + insertErr.message, 'danger');
          btn.disabled = false;
          btn.innerHTML = 'Enviar Avaliação';
          return;
        }
      }
      */
      // Recarregar o perfil do cuidador para mostrar os dados atualizados
      const { data: cuidadorAtualizado } = await supabase.from('c_cuidadores').select('*').eq('id', cuidadorId).single();
      if (cuidadorAtualizado) {
        perfilAtual = cuidadorAtualizado;
        renderPerfil(perfilAtual);
      } else {
        // Fallback: apenas recarrega as avaliações
        carregarAvaliacoes(cuidadorId);
      }

      showToast('Avaliação enviada com sucesso!');
      fecharModalAvaliacao();
      btn.disabled = false;
      btn.innerHTML = 'Enviar Avaliação';
    }

    let contMsg = 0;
    const tamanhoMsg = 300;

    // Envia a mensagem para o cuidador (usado tanto no clique direto quanto
    // na retomada automática após o login com Google) e limpa os campos
    // do formulário quando o envio é concluído com sucesso.
    async function enviarMensagemCuidador(dados, waLinkEl) {
      const originalHtml = waLinkEl ? waLinkEl.innerHTML : '';
      if (waLinkEl) {
        waLinkEl.disabled = true;
        waLinkEl.style.cursor = 'not-allowed';
        waLinkEl.classList.add('opacity-50');
        waLinkEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
      }

      try {
        const { error } = await supabase
          .from('c_mensagens')
          .insert([dados]);

        if (error) throw error;

        showToast('Mensagem enviada com sucesso!', 'success');

        // Limpa todos os campos do formulário após o envio
        const whatsMsgEl = document.getElementById('wa-msg');
        const whatsInputEl = document.getElementById('seu-whats');
        const nomeInputEl = document.getElementById('seu-nome');
        if (whatsMsgEl) whatsMsgEl.value = '';
        if (whatsInputEl) whatsInputEl.value = '';
        if (nomeInputEl) nomeInputEl.value = '';
        const contadorEl = document.getElementById('contador');
        contMsg = tamanhoMsg;
        if (contadorEl) contadorEl.innerHTML = contMsg;

        // Reabilita o botão de envio para permitir uma nova mensagem
        if (waLinkEl) {
          waLinkEl.disabled = false;
          waLinkEl.style.cursor = '';
          waLinkEl.classList.remove('opacity-50');
          waLinkEl.innerHTML = originalHtml;
        }

        // Volta para o perfil do cuidador após o envio
        goTo('perfil');
      } catch (error) {
        console.error(error);
        showToast('Erro ao enviar mensagem.', 'danger');
        if (waLinkEl) {
          waLinkEl.disabled = false;
          waLinkEl.style.cursor = '';
          waLinkEl.classList.remove('opacity-50');
          waLinkEl.innerHTML = originalHtml;
        }
      }
    }

    // Após login vindo de uma mensagem pendente: reabre a tela de envio de
    // mensagem do mesmo cuidador (preenchida com os dados guardados), conclui
    // o envio automaticamente e, ao final, volta para a tela de perfil desse
    // cuidador (mesmo comportamento do envio feito diretamente pelo botão).
    async function enviarMensagemPendenteAposLogin(dadosMensagem, userId) {
      const { data: cuidador, error: erroCuidador } = await supabase
        .from('c_cuidadores')
        .select('*')
        .eq('id', dadosMensagem.cuidador)
        .single();

      document.querySelectorAll('.screen').forEach(el => {
        el.classList.remove('active', 'leaving');
        el.style.display = 'none';
      });
      const screenWhatsapp = document.getElementById('screen-whatsapp');
      if (screenWhatsapp) {
        screenWhatsapp.style.display = 'block';
        screenWhatsapp.classList.add('active');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (!erroCuidador && cuidador) {
        perfilAtual = cuidador;
        await renderWhatsapp(cuidador);
      } else {
        console.error('Erro ao carregar cuidador para reenvio da mensagem pendente:', erroCuidador);
      }

      // renderWhatsapp reseta a mensagem para o texto padrão; preenche de
      // volta com os dados que o usuário havia digitado antes do login.
      const whatsMsgEl = document.getElementById('wa-msg');
      const whatsInputEl = document.getElementById('seu-whats');
      const nomeInputEl = document.getElementById('seu-nome');
      if (whatsMsgEl) whatsMsgEl.value = dadosMensagem.mensagem;
      if (whatsInputEl) whatsInputEl.value = dadosMensagem.whatsapp;
      if (nomeInputEl) nomeInputEl.value = dadosMensagem.nome;

      dadosMensagem.usuario = userId;
      const waLink = document.getElementById('wa-link');
      await enviarMensagemCuidador(dadosMensagem, waLink);
    }

    // WhatsApp
    async function renderWhatsapp(c) {
      const foto = c.foto_url || `https://duoobpxovvpxfgvvghgk.supabase.co/storage/v1/object/public/fotos-cuidadores/avatar-neutro.png`;
      const nome1 = c.nome.split(' ')[0];
      const textoMsg = `Olá, ${nome1}! Vi seu perfil no CuidaDF e `

      contMsg = tamanhoMsg - textoMsg.length;
      document.getElementById('contador').innerHTML = contMsg;

      document.getElementById('wa-nome').textContent = `Fale com ${nome1}`;
      document.getElementById('wa-foto').src = foto;
      if (c.preco === -1) {
        document.getElementById('wa-info').innerHTML = `<strong>${nomePublico(c.nome)}</strong> · Valor a combinar `;
      } else {
        document.getElementById('wa-info').innerHTML = `<strong>${nomePublico(c.nome)}</strong> · R$${c.preco}/plantão`;
      }
      document.getElementById('wa-avaliacao').innerHTML = `<i class="bi bi-star-fill text-warning me-1"></i>${(c.avaliacao || 5).toFixed(1)}`;
      document.getElementById('wa-msg').textContent = `Olá, ${nome1}! Vi seu perfil no CuidaDF e `;
      const waMsg = document.getElementById('wa-msg');
      waMsg.focus();
      waMsg.setSelectionRange(waMsg.value.length, waMsg.value.length);

      const waLink = document.getElementById('wa-link');
      waLink.onclick = async function () {
        const whatsMsg = document.getElementById('wa-msg');
        const whatsInput = document.getElementById('seu-whats');
        const nomeInput = document.getElementById('seu-nome');
        if (whatsInput.value.length < 14 || nomeInput.value.length < 1) {
          showToast('Você precisa digitar uma mensagem e informar seu nome e um WhatsApp válido para contato.', 'danger');
          return;
        }

        const cuidadorId = c.id;

        const dadosMensagem = {
          cuidador: cuidadorId,
          nome: nomeInput.value,
          whatsapp: whatsInput.value,
          mensagem: whatsMsg.value,
          lida: false
        };

        // Exige login com Google antes de enviar a mensagem
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Guarda a mensagem para ser enviada automaticamente assim que o
          // login com Google for concluído (o login recarrega a página).
          localStorage.setItem('mensagemPendente', JSON.stringify(dadosMensagem));
          abrirModalLogin('Faça login com o Google para enviar sua mensagem.');
          return;
        }

        dadosMensagem.usuario = session.user.id;
        await enviarMensagemCuidador(dadosMensagem, waLink);
      };

    }

    // Navegação
    function goTo(id) {
      const current = document.querySelector('.screen.active');
      const next = document.getElementById('screen-' + id);
      if (!next || next === current) return;
      if (current) {
        current.classList.add('leaving');
        setTimeout(() => {
          current.classList.remove('active', 'leaving');
          current.style.display = 'none';
        }, 300);
      }
      setTimeout(() => {
        next.style.display = 'block';
        requestAnimationFrame(() => {
          next.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (id === 'lista') carregarLista();
          if (id === 'perfil' && perfilAtual) renderPerfil(perfilAtual);
          if (id === 'whatsapp' && perfilAtual) renderWhatsapp(perfilAtual);
          if (id === 'como-funciona') renderComoFunciona();
          if (id === 'vagas') carregarVagas();
          if (id === 'mensagens') carregarMensagensCuidador();
        });
      }, current ? 160 : 0);
    }

    // Nomes "agregados" (abrangência ampla) que existem na tabela cidades
    const CIDADES_AGREGADAS = ['Todo o DF', 'Todo o Entorno (GO)', 'DF e Entorno (todas as regiões)'];
    let todasCidades = []; // cache: [{id, nome}]

    // Carrega a tabela `cidades` e popula: selects de busca (única cidade)
    // + checklists de área de atuação (cadastro/edição, múltiplas cidades)
    async function carregarCidades() {
      try {
        const { data, error } = await supabase.from('c_cidades').select('id,nome').order('nome');
        if (error) throw error;
        todasCidades = data || [];

        // Selects de busca (uma única cidade) não mostram as opções agregadas
        const cidadesBusca = todasCidades.filter(c => !CIDADES_AGREGADAS.includes(c.nome));
        preencherSelectBusca('input-cidade', 'Qualquer cidade', cidadesBusca);
        preencherSelectBusca('f-cidade', 'Todas as cidades', cidadesBusca);

        // Checklists de área de atuação (cadastro e edição do cuidador)
        montarChecklistCidades('cad-cidade-check', 'cad-cidade-filtro', 'cad-cidade-selecionadas');
        montarChecklistCidades('edit-cidade-check', 'edit-cidade-filtro', 'edit-cidade-selecionadas');
      } catch (error) {
        console.error('Erro ao carregar cidades:', error.message);
      }
    }

    function preencherSelectBusca(selectId, textoPadrao, lista) {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = textoPadrao;
      def.selected = true;
      select.appendChild(def);
      lista.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.nome;
        opt.textContent = c.nome;
        select.appendChild(opt);
      });
    }

    function agruparCidades(lista) {
      const grupos = { 'Abrangência': [], 'Distrito Federal': [], 'Goiás (Entorno)': [] };
      lista.forEach(c => {
        if (CIDADES_AGREGADAS.includes(c.nome)) grupos['Abrangência'].push(c);
        else if (c.nome.startsWith('GO -')) grupos['Goiás (Entorno)'].push(c);
        else grupos['Distrito Federal'].push(c);
      });
      return grupos;
    }

    // Renderiza o checklist de cidades (agrupado) dentro de containerId,
    // preservando o que já estava marcado e ligando o campo de filtro
    function montarChecklistCidades(containerId, filtroId, chipsId, termo = '') {
      const container = document.getElementById(containerId);
      if (!container) return;
      const selecionadasAntes = getCidadesSelecionadas(containerId);
      const termoLower = termo.trim().toLowerCase();
      const lista = todasCidades.filter(c => !termoLower || c.nome.toLowerCase().includes(termoLower));
      const grupos = agruparCidades(lista);

      container.innerHTML = '';
      let algumaCidade = false;
      Object.keys(grupos).forEach(grupo => {
        if (!grupos[grupo].length) return;
        algumaCidade = true;
        const label = document.createElement('div');
        label.className = 'cidade-grupo-label';
        label.textContent = grupo;
        container.appendChild(label);
        grupos[grupo].forEach(c => {
          const item = document.createElement('label');
          item.className = 'cidade-item';
          item.innerHTML = `<input type="checkbox" class="form-check-input m-0" value="${c.nome}" ${selecionadasAntes.includes(c.nome) ? 'checked' : ''}> ${c.nome}`;
          item.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked && CIDADES_AGREGADAS.includes(e.target.value)) {
              aplicarExclusaoAbrangencia(containerId, e.target.value);
            }
            renderChipsSelecionadas(containerId, chipsId);
          });
          container.appendChild(item);
        });
      });
      if (!algumaCidade) {
        container.innerHTML = '<div class="cidade-vazio">Nenhuma cidade encontrada.</div>';
      }
      renderChipsSelecionadas(containerId, chipsId);

      const filtroInput = document.getElementById(filtroId);
      if (filtroInput && !filtroInput.dataset.bound) {
        filtroInput.dataset.bound = '1';
        filtroInput.addEventListener('input', () => montarChecklistCidades(containerId, filtroId, chipsId, filtroInput.value));
      }
    }

    function getCidadesSelecionadas(containerId) {
      return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)).map(el => el.value);
    }

    // Marca no checklist as cidades já salvas no perfil (usado na edição)
    function setCidadesSelecionadas(containerId, chipsId, valores) {
      document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => {
        cb.checked = (valores || []).includes(cb.value);
      });
      renderChipsSelecionadas(containerId, chipsId);
    }

    function renderChipsSelecionadas(containerId, chipsId) {
      const chipsEl = document.getElementById(chipsId);
      if (!chipsEl) return;
      const selecionadas = getCidadesSelecionadas(containerId);
      chipsEl.innerHTML = selecionadas.map(nome =>
        `<span class="chip-cidade" data-nome="${nome}">${nome} <i class="bi bi-x-circle-fill"></i></span>`
      ).join('');
      chipsEl.querySelectorAll('.chip-cidade i').forEach(icon => {
        icon.addEventListener('click', () => {
          const nome = icon.parentElement.getAttribute('data-nome');
          const cb = container_findCheckbox(containerId, nome);
          if (cb) { cb.checked = false; renderChipsSelecionadas(containerId, chipsId); }
        });
      });
    }

    function container_findCheckbox(containerId, nome) {
      return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]`)).find(cb => cb.value === nome);
    }

    // Ao marcar uma opção agregada, desmarca apenas o escopo correspondente:
    // - "Todo o DF" desmarca só as cidades do Distrito Federal (permite manter cidades específicas do Entorno)
    // - "Todo o Entorno (GO)" desmarca só as cidades de Goiás (permite manter cidades específicas do DF)
    // - "DF e Entorno (todas as regiões)" desmarca tudo, já que cobre as duas regiões por completo
    function aplicarExclusaoAbrangencia(containerId, valorMarcado) {
      document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach(cb => {
        if (cb.value === valorMarcado) return;
        const ehCidadeGO = cb.value.startsWith('GO -');
        if (valorMarcado === 'DF e Entorno (todas as regiões)') {
          cb.checked = false;
        } else if (valorMarcado === 'Todo o DF') {
          if (!ehCidadeGO && !CIDADES_AGREGADAS.includes(cb.value)) cb.checked = false;
        } else if (valorMarcado === 'Todo o Entorno (GO)') {
          if (ehCidadeGO) cb.checked = false;
        }
      });
    }

    async function renderComoFunciona() {
      const current = document.querySelector('.screen.active');
      const container = document.getElementById('como-funciona');

      if (current) {
        current.classList.remove('active');
      }
      if (container) {
        container.classList.add('active');
      }
    }
    // Carregar lista de cuidadores
    async function carregarLista() {
      const current = document.querySelector('.screen.active');
      const container = document.getElementById('lista-cards');
      container.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-success" role="status"></div><div class="text-muted mt-3 small">Buscando cuidadores...</div></div>`;
      let fc = document.getElementById('f-cidade').value;
      let fp = document.getElementById('f-preco').value;
      let fv = document.getElementById('f-disp').value;
      let fe = document.getElementById('f-exp').value;

      if (current.id == 'screen-home') {
        fc = document.getElementById('input-cidade').value;
        fp = document.getElementById('input-preco').value;
        fv = document.getElementById('input-disp').value;
        fe = document.getElementById('input-exp').value;

        // atualizar selects de cima
        document.getElementById('f-cidade').value = fc;
        document.getElementById('f-preco').value = fp;
        document.getElementById('f-disp').value = fv;
      }

      let sorteio = Math.floor(Math.random() * 7);
      let campo = 'whatsapp';
      if (sorteio == 1)
        campo = 'id';
      if (sorteio == 2)
        campo = 'nome';
      if (sorteio == 3)
        campo = 'whatsapp';
      if (sorteio == 4)
        campo = 'foto_url';
      if (sorteio == 5)
        campo = 'sobre';
      if (sorteio == 6)
        campo = 'area_atuacao';
      if (sorteio == 7)
        campo = 'created_at';

      sorteio = Math.floor(Math.random() * 2);
      let asc = true;
      if (sorteio == 1)
        asc = false;

      let query = supabase.from('c_cuidadores').select('*').order(campo, { ascending: asc }).eq('disponivel', true);

      if (fc) {
        // Um cuidador aparece se a cidade buscada estiver na área dele,
        // OU se ele atende "Todo o DF"/"Todo o Entorno (GO)" (conforme a região da cidade buscada),
        // OU se ele atende "DF e Entorno (todas as regiões)".
        const ehEntorno = fc.startsWith('GO -');
        const aceitos = [fc, 'DF e Entorno (todas as regiões)', ehEntorno ? 'Todo o Entorno (GO)' : 'Todo o DF'];
        query = query.overlaps('area_atuacao', aceitos);
      }
      if (fv === 'Sim') query = query.eq('verificado', true);
      else if (fv === 'Não') query = query.eq('verificado', false);

      const { data, error } = await query;
      if (error) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Erro: ${error.message}</div></div>`;
        return;
      }

      let lista = data || [];
      const maxP = { 'Até R$ 80': 80, 'Até R$ 100': 100, 'Até R$ 150': 150 };
      if (maxP[fp]) lista = lista.filter(c => c.preco <= maxP[fp]);
      if (fp === 'Acima de R$ 150') lista = lista.filter(c => c.preco > 150);
      const minA = { '1+ ano': 1, '3+ anos': 3, '5+ anos': 5 };
      if (minA[fe]) lista = lista.filter(c => expToAnos(c.experiencia) >= minA[fe]);

      document.getElementById('lista-cidade-titulo').textContent = fc || 'sua região';
      document.getElementById('lista-contador').textContent = `${lista.length} cuidador${lista.length !== 1 ? 'es' : ''} encontrado${lista.length !== 1 ? 's' : ''}`;

      if (lista.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><i class="bi bi-search fs-1 text-muted"></i><p class="mt-3 text-muted">Nenhum cuidador encontrado.</p><button class="btn btn-outline-brand btn-sm" id="btn-limpar">Limpar filtros</button></div>`;
        document.getElementById('btn-limpar')?.addEventListener('click', () => {
          ['f-cidade', 'f-preco', 'f-disp', 'f-exp'].forEach(id => document.getElementById(id).value = '');
          carregarLista();
        });
        return;
      }

      container.innerHTML = '';
      lista.forEach((c, i) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.style.cssText = `opacity:0;transform:translateY(20px);transition:opacity .35s ${i * 0.07}s ease,transform .35s ${i * 0.07}s ease`;
        const foto = c.foto_url || `https://duoobpxovvpxfgvvghgk.supabase.co/storage/v1/object/public/fotos-cuidadores/avatar-neutro.png`;
        let P = '';
        if (c.preco === -1) {
          P = 'a combinar';
        } else {
          P = `R$${c.preco}<small>/plantão</small>`;
        }

        const areaTexto = (Array.isArray(c.area_atuacao) && c.area_atuacao.length) ? c.area_atuacao.join(', ') : 'Área não informada';
        col.innerHTML = `<div class="cuidador-card h-100 p-4"><div class="d-flex align-items-start gap-3 mb-3"><img src="${foto}" class="avatar" alt="${nomePublico(c.nome)}" onerror="this.src='https://i.pravatar.cc/200?u=${c.id}'"/><div class="flex-grow-1"><div class="fw-700 mb-1">${nomePublico(c.nome)}</div><div class="d-flex flex-wrap gap-1 mb-1">${c.verificado ? '<span class="badge-verificado"><i class="bi bi-patch-check-fill me-1"></i>Verificado</span>' : ''}${c.disponivel ? '<span class="badge-disponivel"><i class="bi bi-circle-fill me-1" style="font-size:.55rem"></i>Disponível</span>' : '<span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.7rem;border-radius:2rem">Indisponível</span>'}</div><div class="stars">${stars(c.avaliacao)} <small class="text-muted ms-1">${(c.avaliacao || 5).toFixed(1)} (${c.total_reviews || 0})</small></div></div></div><div class="small text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${areaTexto}</div><div class="small text-muted mb-3"><i class="bi bi-briefcase me-1"></i>${c.experiencia} de experiência</div><div class="d-flex align-items-center justify-content-between"><div class="price-tag">${P}</div><button class="btn btn-brand btn-sm px-3">Ver perfil <i class="bi bi-arrow-right ms-1"></i></button></div></div>`;
        col.querySelector('.cuidador-card').addEventListener('click', () => {
          perfilAtual = c;
          goTo('perfil');
        });
        container.appendChild(col);
        setTimeout(() => {
          col.style.opacity = '1';
          col.style.transform = 'translateY(0)';
        }, 50 + i * 70);
      });
    }

    // Carregar lista de vagas de emprego (cadastradas pelo admin) e
    // marcar quais o cuidador logado já registrou interesse.
    let vagasCache = [];
    let vagasCandidatadasCache = new Set();
    let vagaModalAtual = null; // vaga atualmente exibida na modal (usado para gerar o link de compartilhamento)

    function resumirTexto(texto, limite = 140) {
      if (!texto) return '';
      if (texto.length <= limite) return texto;
      const cortado = texto.slice(0, limite);
      const ultimoEspaco = cortado.lastIndexOf(' ');
      return cortado.slice(0, ultimoEspaco > 0 ? ultimoEspaco : limite) + '…';
    }

    async function carregarVagas() {
      const container = document.getElementById('vagas-cards');
      container.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-success" role="status"></div><div class="text-muted mt-3 small">Buscando vagas...</div></div>`;

      const { data: vagas, error } = await supabase
        .from('c_vagas')
        .select('*')
        .eq('ativa', true)
        .order('created_at', { ascending: false });

      if (error) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-danger">Erro: ${error.message}</div></div>`;
        return;
      }

      vagasCache = vagas || [];

      if (vagasCache.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><i class="bi bi-briefcase fs-1 text-muted"></i><p class="mt-3 text-muted">Nenhuma vaga disponível no momento.</p></div>`;
        return;
      }

      // Descobre quais vagas o cuidador logado (se houver) já registrou interesse.
      vagasCandidatadasCache = new Set();
      const { data: { session } } = await supabase.auth.getSession();
      if (session && currentUserRole === 'cuidador') {
        const { data: candidaturas } = await supabase
          .from('c_candidaturas')
          .select('vaga_id')
          .eq('cuidador_id', session.user.id);
        vagasCandidatadasCache = new Set((candidaturas || []).map(c => c.vaga_id));
      }

      container.innerHTML = '';
      vagasCache.forEach((v) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        const jaCandidatado = vagasCandidatadasCache.has(v.id);
        const detalhes = [v.tipo_contrato, v.carga_horaria, v.remuneracao].filter(Boolean).join(' · ');
        col.innerHTML = `
          <div class="cuidador-card h-100 p-4" style="cursor:pointer" data-vaga-id="${v.id}">
            <div class="fw-700 mb-1">${v.titulo}</div>
            ${v.empresa ? `<div class="small text-muted mb-2">${v.empresa}</div>` : ''}
            <div class="small text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${v.cidade}</div>
            ${detalhes ? `<div class="small text-muted mb-3"><i class="bi bi-briefcase me-1"></i>${detalhes}</div>` : ''}
            <p class="small mb-3">${resumirTexto(v.descricao)}</p>
              <div class="btn btn-brand btn-sm px-3">Ver vaga completa <i class="bi bi-arrow-right"></i></div>
            ${jaCandidatado ? '<div class="small text-muted mt-2"><i class="bi bi-check2 me-1"></i>Você já registrou interesse</div>' : ''}
          </div>`;
        col.querySelector('[data-vaga-id]').addEventListener('click', () => abrirVagaModal(v.id));
        container.appendChild(col);
      });
    }

    // Carrega as mensagens recebidas pelo cuidador logado, da mais recente
    // para a mais antiga. Cada cuidador só vê as próprias mensagens: a
    // consulta já filtra por cuidador = id do usuário logado, e o mesmo
    // filtro deve existir como política de RLS na tabela c_mensagens para
    // impedir que alguém acesse mensagens de outro cuidador via API.
    async function carregarMensagensCuidador() {
      const container = document.getElementById('mensagens-lista');
      if (!container) return;
      container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div><div class="text-muted mt-3 small">Carregando mensagens...</div></div>`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || currentUserRole !== 'cuidador') {
        container.innerHTML = `<div class="alert alert-warning">Você precisa estar logado como cuidador para ver suas mensagens.</div>`;
        return;
      }

      const { data: mensagens, error } = await supabase
        .from('c_mensagens')
        .select('*')
        .eq('cuidador', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        container.innerHTML = `<div class="alert alert-danger">Erro ao carregar mensagens: ${error.message}</div>`;
        return;
      }

      if (!mensagens || mensagens.length === 0) {
        container.innerHTML = `<div class="text-center py-5"><i class="bi bi-chat-dots fs-1 text-muted"></i><p class="mt-3 text-muted">Você ainda não recebeu nenhuma mensagem.</p></div>`;
        return;
      }

      container.innerHTML = '';
      mensagens.forEach((m) => {
        const dataFormatada = new Date(m.created_at).toLocaleString('pt-BR');
        const whatsLink = (m.whatsapp || '').replace(/\D/g, '');
        const card = document.createElement('div');
        card.className = 'cuidador-card p-4 mb-3';
        card.innerHTML = `
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mensagem-resumo" style="cursor:pointer">
            <div class="fw-700">Mensagem de ${m.nome} ${!m.lida ? '<span class="badge bg-danger ms-1">Nova</span>' : ''}</div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted" style="font-size:.75rem">${dataFormatada}</span>
              <i class="bi bi-chevron-down mensagem-chevron text-muted"></i>
            </div>
          </div>
          <div class="mensagem-detalhes mt-3" style="display:none">
            <p class="mb-3" style="white-space:pre-line">${m.mensagem || ''}</p>
            ${whatsLink ? `<a class="btn btn-whatsapp btn-sm" href="https://wa.me/55${whatsLink}" target="_blank" rel="noopener"><i class="bi bi-whatsapp me-1" style="font-size:.8rem"></i>Chamar no WhatsApp</a>` : ''}
          </div>
        `;

        const resumo = card.querySelector('.mensagem-resumo');
        const detalhes = card.querySelector('.mensagem-detalhes');
        const chevron = card.querySelector('.mensagem-chevron');
        let aberto = false;

        resumo.addEventListener('click', async () => {
          aberto = !aberto;
          detalhes.style.display = aberto ? 'block' : 'none';
          chevron.className = aberto ? 'bi bi-chevron-up mensagem-chevron text-muted' : 'bi bi-chevron-down mensagem-chevron text-muted';

          // Ao exibir os detalhes, marca a mensagem como lida (se ainda não estiver).
          if (aberto && !m.lida) {
            m.lida = true;
            const badgeNova = resumo.querySelector('.badge');
            if (badgeNova) badgeNova.remove();

            // Atualiza o indicador da navbar imediatamente, sem esperar a resposta do servidor.
            const badgeNav = document.getElementById('mensagens-badge');
            if (badgeNav) {
              const atual = parseInt(badgeNav.textContent, 10) || 0;
              const novoValor = Math.max(atual - 1, 0);
              if (novoValor > 0) {
                badgeNav.textContent = String(novoValor);
                badgeNav.style.display = 'inline-block';
              } else {
                badgeNav.textContent = '0';
                badgeNav.style.display = 'none';
              }
            }

            const { data: dataLido, error: erroLido } = await supabase
              .from('c_mensagens')
              .update({ lida: true })
              .eq('id', m.id)
              .select();

            if (erroLido) {
              console.error('Erro ao marcar mensagem como lida:', erroLido);
            } else if (!dataLido || dataLido.length === 0) {
              // A query não retornou erro, mas também não alterou nenhuma linha —
              // sinal clássico de que falta uma policy de UPDATE para "c_mensagens"
              // no Supabase (RLS bloqueia silenciosamente, sem gerar erro).
              console.warn('A mensagem não foi marcada como lida no banco: nenhuma linha foi atualizada. Verifique se existe uma policy de UPDATE para a tabela c_mensagens permitindo que o cuidador atualize suas próprias mensagens.');
            }
            // Reconfirma a contagem exata a partir do servidor.
            atualizarBadgeMensagensNaoLidas(session.user.id);
          }
        });

        container.appendChild(card);
      });
    }

    // Abre o modal com a vaga completa a partir do cache carregado em carregarVagas().
    function abrirVagaModal(vagaId) {
      const v = vagasCache.find(x => x.id === vagaId);
      if (!v) return;

      vagaModalAtual = v;

      const jaCandidatado = vagasCandidatadasCache.has(v.id);
      const detalhes = [v.tipo_contrato, v.carga_horaria, v.remuneracao].filter(Boolean).join(' · ');

      document.getElementById('vaga-modal-titulo').textContent = v.titulo;
      document.getElementById('vaga-modal-empresa').textContent = v.empresa || '';
      document.getElementById('vaga-modal-empresa').style.display = v.empresa ? '' : 'none';
      document.getElementById('vaga-modal-cidade').textContent = v.cidade;
      document.getElementById('vaga-modal-detalhes').textContent = detalhes;
      document.getElementById('vaga-modal-detalhes').style.display = detalhes ? '' : 'none';
      document.getElementById('vaga-modal-descricao').textContent = v.descricao;

      const reqWrap = document.getElementById('vaga-modal-requisitos-wrap');
      if (v.requisitos) {
        reqWrap.style.display = '';
        document.getElementById('vaga-modal-requisitos').textContent = v.requisitos;
      } else {
        reqWrap.style.display = 'none';
      }

      const btn = document.getElementById('vaga-modal-candidatar');
      if (jaCandidatado) {
        btn.className = 'btn btn-outline-secondary w-100 mb-2';
        btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Você já registrou interesse';
        btn.disabled = true;
      } else {
        btn.className = 'btn btn-brand w-100 mb-2';
        btn.innerHTML = 'Tenho interesse';
        btn.disabled = false;
        btn.onclick = () => candidatarVaga(v.id, btn);
      }

      document.getElementById('vagaModal').style.display = 'flex';
    }

    function fecharVagaModal() {
      document.getElementById('vagaModal').style.display = 'none';
    }

    // Cuidador logado se candidata a uma vaga.
    async function candidatarVaga(vagaId, btn) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.setItem('intencao', 'c');
        localStorage.setItem('candidaturaPendente', vagaId);
        showToast('Você precisa estar logado para se candidatar.', 'warning');
        abrirModalLogin('Faça login como cuidador para se candidatar a esta vaga.');
        return;
      }
      if (currentUserRole !== 'cuidador') {
        showToast('Somente cuidadores cadastrados podem se candidatar às vagas.', 'warning');
        return;
      }

      btn.disabled = true;
      const textoOriginal = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

      const { error } = await supabase.from('c_candidaturas').insert([{
        vaga_id: vagaId,
        cuidador_id: session.user.id
      }]);

      if (error) {
        // Código 23505 = violação de unicidade (vaga_id, cuidador_id) — já registrou interesse antes.
        if (error.code === '23505') {
          showToast('Você já havia se candidatado a essa vaga.', 'info');
          vagasCandidatadasCache.add(vagaId);
          btn.className = 'btn btn-outline-secondary w-100 mb-2';
          btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Você já registrou interesse';
          return;
        }
        showToast('Erro ao enviar candidatura: ' + error.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
        return;
      }

      vagasCandidatadasCache.add(vagaId);
      showToast('Candidatura enviada com sucesso!');
      btn.className = 'btn btn-outline-secondary w-100 mb-2';
      btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Você já registrou interesse';
      // Atualiza o card da lista por trás do modal também.
      const cardBtn = document.querySelector(`[data-vaga-id="${vagaId}"]`);
      if (cardBtn && !cardBtn.querySelector('.text-muted.mt-2')) {
        const aviso = document.createElement('div');
        aviso.className = 'small text-muted mt-2';
        aviso.innerHTML = '<i class="bi bi-check2 me-1"></i>Você já registrou interesse';
        cardBtn.appendChild(aviso);
      }
    }

    // Cadastro de cuidador (criação)
    async function salvarCadastro() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast('Você precisa estar logado para se cadastrar como cuidador.', 'warning'); abrirModalLogin(); return; }

      const nome = document.getElementById('cad-nome').value.trim();
      const sobrenome = document.getElementById('cad-sobrenome').value.trim();
      const area_atuacao = getCidadesSelecionadas('cad-cidade-check');
      const whatsapp = document.getElementById('cad-whatsapp').value.trim().replace(/\D/g, '');
      const preco = parseFloat(document.getElementById('cad-preco').value);
      const experiencia = document.getElementById('cad-exp').value;
      const sobre = document.getElementById('cad-sobre').value.trim();
      const quero_verificacao = document.getElementById('cad-quero-verificacao').checked;
      const servicos = Array.from(document.querySelectorAll('#servicos-check input:checked')).map(el => el.parentElement.textContent.trim());
      const fotoInput = document.getElementById('cad-foto-input');

      const erros = coletarErros([
        validarNome(nome),
        validarSobrenome(sobrenome),
        validarAreaAtuacao(area_atuacao),
        validarWhatsapp(whatsapp),
        validarPreco(preco),
        validarSobre(sobre),
        validarFoto(fotoInput.files && fotoInput.files[0])
      ]);

      if (erros.length) {
        showToastErros(erros);
        return;
      }

      const btn = document.getElementById('btn-cadastrar');
      btn.disabled = true;

      let foto_url = 'https://duoobpxovvpxfgvvghgk.supabase.co/storage/v1/object/public/fotos-cuidadores/avatar.png';
      const file = fotoInput.files[0];
      if (file) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando foto...';
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from('fotos-cuidadores').upload(fileName, file, { contentType: file.type, upsert: false });
        if (upErr) {
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Publicar meu perfil gratuitamente';
          showToast('Erro no upload da foto: ' + upErr.message, 'danger');
          return;
        }
        const { data: urlData } = supabase.storage.from('fotos-cuidadores').getPublicUrl(upData.path);
        foto_url = urlData.publicUrl;
      }

      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publicando perfil...';
      const { error } = await supabase.from('c_cuidadores').insert([{
        nome, sobrenome, area_atuacao, whatsapp, preco, experiencia, sobre, servicos, quero_verificacao, foto_url,
        disponivel: false, avaliacao: 5.0, total_reviews: 0, id: session.user.id
      }]);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Publicar meu perfil gratuitamente';
      if (error) {
        showToast('Erro: ' + error.message, 'danger');
      } else {
        showToast('Perfil publicado com sucesso! 🎉');
        setTimeout(() => goTo('lista'), 2000);
      }
    }

    // Bind de eventos
    function bindEvents() {
      // Uploads
      document.getElementById('upload-area').addEventListener('click', () => document.getElementById('cad-foto-input').click());
      document.getElementById('cad-foto-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) { showToast('A foto não deve ser maior que 500 KB!', 'danger'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('foto-preview');
          preview.src = ev.target.result;
          preview.style.display = 'block';
          document.getElementById('upload-icon').style.display = 'none';
          document.getElementById('upload-label').textContent = file.name;
          document.getElementById('upload-sub').textContent = (file.size / 1024).toFixed(0) + ' KB';
        };
        reader.readAsDataURL(file);
      });

      document.getElementById('edit-upload-area').addEventListener('click', () => document.getElementById('edit-foto-input').click());
      document.getElementById('edit-foto-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) { showToast('A foto deve ter no máximo 500 KB', 'danger'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('edit-foto-preview');
          preview.src = ev.target.result;
          preview.style.display = 'block';
          document.getElementById('edit-upload-icon').style.display = 'none';
          document.getElementById('edit-upload-label').innerHTML = 'Clique para alterar a foto';
        };
        reader.readAsDataURL(file);
      });

      document.getElementById('user-upload-area').addEventListener('click', () => document.getElementById('user-foto-input').click());
      document.getElementById('user-foto-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) { showToast('A foto deve ter no máximo 500 KB', 'danger'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('user-foto-preview');
          preview.src = ev.target.result;
          preview.style.display = 'block';
          document.getElementById('user-upload-icon').style.display = 'none';
          document.getElementById('user-upload-label').textContent = file.name;
          document.getElementById('user-upload-sub').textContent = (file.size / 1024).toFixed(0) + ' KB';
        };
        reader.readAsDataURL(file);
      });

      // Navegação
      document.getElementById('nav-logo').addEventListener('click', () => goTo('home'));
      document.getElementById('nav-buscar').addEventListener('click', () => goTo('lista'));
      document.getElementById('hero-buscar').addEventListener('click', () => goTo('lista'));
      document.getElementById('func-buscar').addEventListener('click', () => goTo('lista'));
      document.getElementById('btn-buscar-home').addEventListener('click', () => goTo('lista'));
      /* document.getElementById('btn-buscar-home').addEventListener('click', () => {
        const cidade = document.getElementById('input-cidade').value;
        const preco = document.getElementById('input-preco').value;
        const verificado = document.getElementById('input-disp').value;
        const exp = document.getElementById('input-exp').value;
        goTo('lista');
        setTimeout(() => {
          if (cidade) document.getElementById('f-cidade').value = cidade;
          if (preco) document.getElementById('f-preco').value = preco;
          if (verificado) document.getElementById('f-disp').value = verificado;
          if (exp) document.getElementById('f-exp').value = exp;
          carregarLista();
        }, 350);
      }); */
      document.getElementById('lista-voltar').addEventListener('click', () => goTo('home'));
      document.getElementById('indisponivel-voltar').addEventListener('click', () => goTo('lista'));
      document.getElementById('func-voltar').addEventListener('click', () => goTo('home'));
      document.getElementById('perfil-voltar').addEventListener('click', () => goTo('lista'));
      document.getElementById('perfil-contato-desktop').addEventListener('click', () => goTo('whatsapp'));
      document.getElementById('perfil-contato-mobile').addEventListener('click', () => goTo('whatsapp'));
      document.getElementById('cadastro-voltar').addEventListener('click', () => goTo('home'));
      document.getElementById('editar-voltar').addEventListener('click', () => goTo('home'));
      document.getElementById('btn-copiar-link-perfil').addEventListener('click', () => {
        const campoLink = document.getElementById('edit-link-perfil');
        campoLink.select();
        campoLink.setSelectionRange(0, 99999);
        const copiarFallback = () => {
          try {
            document.execCommand('copy');
            showToast('Link copiado!');
          } catch (e) {
            showToast('Não foi possível copiar o link', 'danger');
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(campoLink.value).then(() => {
            showToast('Link copiado!');
          }).catch(copiarFallback);
        } else {
          copiarFallback();
        }
      });
      document.getElementById('cadastro-usuario-voltar').addEventListener('click', () => goTo('home'));
      document.getElementById('vagas-voltar').addEventListener('click', () => goTo('home'));
      document.getElementById('close-vaga-modal').addEventListener('click', fecharVagaModal);
      document.getElementById('vaga-modal-compartilhar').addEventListener('click', async () => {
        if (!vagaModalAtual) return;
        const link = gerarLinkVaga(vagaModalAtual);

        if (navigator.share) {
          try {
            await navigator.share({ title: vagaModalAtual.titulo, text: 'Confira esta vaga:', url: link });
            return;
          } catch (e) {
            // Usuário cancelou o compartilhamento nativo ou o navegador falhou; cai no fallback de copiar.
          }
        }

        const copiarFallback = () => {
          const temp = document.createElement('input');
          temp.value = link;
          document.body.appendChild(temp);
          temp.select();
          temp.setSelectionRange(0, 99999);
          try {
            document.execCommand('copy');
            showToast('Link da vaga copiado!');
          } catch (e) {
            showToast('Não foi possível copiar o link', 'danger');
          }
          document.body.removeChild(temp);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(() => {
            showToast('Link da vaga copiado!');
          }).catch(copiarFallback);
        } else {
          copiarFallback();
        }
      });
      document.getElementById('vagaModal').addEventListener('click', (e) => {
        if (e.target.id === 'vagaModal') fecharVagaModal();
      });
      document.getElementById('btn-cadastrar').addEventListener('click', salvarCadastro);
      document.getElementById('btn-atualizar').addEventListener('click', (e) => atualizarPerfil(e));
      document.getElementById('btn-cadastrar-usuario').addEventListener('click', salvarCadastroUsuario);
      document.getElementById('wa-voltar').addEventListener('click', () => goTo('perfil'));
      ['f-cidade', 'f-preco', 'f-disp', 'f-exp'].forEach(id => document.getElementById(id).addEventListener('change', carregarLista));

      let queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      const intc = urlParams.get('intc');

      if (intc != '' && intc != null) {
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const vagaPendente = localStorage.getItem('candidaturaPendente');
          const mensagemPendenteRaw = localStorage.getItem('mensagemPendente');

          if (session && mensagemPendenteRaw) {
            // Login via Google recarrega a página; retoma o envio da
            // mensagem que estava pendente antes do login, permanecendo
            // na tela de envio.
            localStorage.removeItem('mensagemPendente');
            try {
              const dadosMensagem = JSON.parse(mensagemPendenteRaw);
              await enviarMensagemPendenteAposLogin(dadosMensagem, session.user.id);
            } catch (e) {
              console.error('Erro ao reenviar mensagem pendente:', e);
            }
            return;
          }

          const destinoAposLogin = localStorage.getItem('destinoAposLogin');
          if (session && destinoAposLogin === 'mensagens') {
            // Login via Google recarrega a página; retoma o acesso direto
            // à tela de mensagens (ex.: link vindo de ?ir=mensagens).
            localStorage.removeItem('destinoAposLogin');
            const perfilCuidador = await verificarPerfilAtivo(session.user.id);
            if (perfilCuidador) {
              goTo('mensagens');
            } else {
              showToast('A área de mensagens é exclusiva para cuidadores.', 'warning');
              goTo('home');
            }
            return;
          }

          if (session && vagaPendente) {
            // Login via Google recarrega a página; delega para a mesma lógica
            // usada no login por e-mail/senha, que já sabe tratar a vaga pendente.
            await redirecionarAposLogin(session.user);
          } else {
            if (localStorage.getItem('intencao') == 'c') {
              handleSouCuidador();
            }
            if (localStorage.getItem('intencao') == 'u') {
              handleSouUsuario();
            }
          }
        })();
        let queryString = new URL(window.location.href);
        queryString.searchParams.delete('intc');
        window.history.replaceState({}, '', queryString);
      }

      // Botões "Sou Cuidador" e "Sou Usuário"
      async function handleSouCuidador() {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          localStorage.setItem('intencao', 'c');
          abrirModalLogin(vindoDeLinkCadastro ? 'Faça login para continuar seu cadastro como cuidador.' : undefined);
          return;
        }
        const perfil = await verificarPerfilAtivo(session.user.id);
        if (perfil) { await preencherFormularioEdicao(perfil); goTo('editar'); }
        else goTo('cadastro');

        // localStorage.removeItem('intencao');
        document.getElementById('nav-cadastro').classList.add('d-md-inline-flex');
        document.getElementById('nav-cadastro-usuario').classList.remove('d-md-inline-flex');
      }
      async function handleSouUsuario() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          localStorage.setItem('intencao', 'u');
          abrirModalLogin();
          return;
        }
        const { data: usuario } = await supabase.from('c_usuarios').select('id').eq('id', session.user.id).single();
        if (usuario) {
          showToast('Você já possui um perfil de usuário.');
          goTo('home');
        } else {
          goTo('cadastro-usuario');
        }

        // localStorage.removeItem('intencao');
        document.getElementById('nav-cadastro').classList.remove('d-md-inline-flex');
        document.getElementById('nav-cadastro-usuario').classList.add('d-md-inline-flex');
      }

      document.getElementById('nav-cadastro').addEventListener('click', handleSouCuidador);
      document.getElementById('hero-cadastro').addEventListener('click', handleSouCuidador);
      document.getElementById('func-cadastro').addEventListener('click', handleSouCuidador);

      // Link direto para o cadastro de cuidador: ?ir=cadastro
      // Ex.: https://seusite.com/?ir=cadastro
      const irDireto = urlParams.get('ir');
      let vindoDeLinkCadastro = false;
      if (irDireto === 'cadastro') {
        vindoDeLinkCadastro = true;
        handleSouCuidador();
        const urlSemParam = new URL(window.location.href);
        urlSemParam.searchParams.delete('ir');
        window.history.replaceState({}, '', urlSemParam);
      }

      // Link direto para as mensagens do cuidador: ?ir=mensagens
      // Ex.: https://seusite.com/?ir=mensagens
      // Pensado para uso em notificações/Edge Functions (ex.: avisar o
      // cuidador por WhatsApp que chegou uma nova mensagem, com um link que
      // já abre a tela de mensagens). Exige login do cuidador.
      if (irDireto === 'mensagens') {
        handleIrMensagens();
        const urlSemParam = new URL(window.location.href);
        urlSemParam.searchParams.delete('ir');
        window.history.replaceState({}, '', urlSemParam);
      }
      document.getElementById('hero-como-funciona').addEventListener('click', () => goTo('como-funciona'));
      document.getElementById('nav-cadastro-usuario').addEventListener('click', handleSouUsuario);
      document.getElementById('hero-cadastro-usuario').addEventListener('click', handleSouUsuario);

      // Abre diretamente a tela de mensagens do cuidador logado. Usada pelo
      // link direto ?ir=mensagens (por exemplo, enviado por uma Edge Function
      // quando uma nova mensagem chega para o cuidador). Exige login: se não
      // houver sessão, guarda a intenção e abre o modal de login com Google;
      // o fluxo é retomado automaticamente após o redirecionamento (ver
      // bloco de tratamento do parâmetro "intc" mais abaixo).
      async function handleIrMensagens() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          localStorage.setItem('destinoAposLogin', 'mensagens');
          abrirModalLogin('Faça login como cuidador para ver suas mensagens.');
          return;
        }
        const perfilCuidador = await verificarPerfilAtivo(session.user.id);
        if (!perfilCuidador) {
          showToast('A área de mensagens é exclusiva para cuidadores.', 'warning');
          goTo('home');
          return;
        }
        goTo('mensagens');
      }
      document.getElementById('nav-vagas').addEventListener('click', () => goTo('vagas'));
      document.getElementById('hero-vagas').addEventListener('click', () => goTo('vagas'));

      // Botão "Mensagens" (visível somente para cuidadores logados)
      document.getElementById('nav-mensagens').addEventListener('click', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || currentUserRole !== 'cuidador') {
          showToast('Você precisa estar logado como cuidador para ver suas mensagens.', 'warning');
          return;
        }
        goTo('mensagens');
      });
      document.getElementById('mensagens-voltar').addEventListener('click', () => goTo('home'));

      // Avaliação modal
      document.getElementById('btn-avaliar-cuidador').addEventListener('click', abrirModalAvaliacao);
      document.getElementById('close-avaliacao-modal').addEventListener('click', fecharModalAvaliacao);
      document.getElementById('btn-enviar-avaliacao').addEventListener('click', enviarAvaliacao);

      // Estrelas no modal de avaliação
      document.querySelectorAll('#rating-stars i').forEach(star => {
        star.addEventListener('click', () => {
          const value = parseInt(star.getAttribute('data-value'));
          avaliacaoNota = value;
          document.getElementById('avaliacao-nota').value = value;
          document.querySelectorAll('#rating-stars i').forEach(s => {
            const sVal = parseInt(s.getAttribute('data-value'));
            if (sVal <= value) {
              s.classList.remove('bi-star');
              s.classList.add('bi-star-fill', 'active');
            } else {
              s.classList.remove('bi-star-fill', 'active');
              s.classList.add('bi-star');
            }
          });
        });
      });
      carregarCidades();
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session != undefined) {
      updateAuthUI(session?.user ?? null);
    }

    bindEvents();
    document.getElementById('screen-home').style.display = 'block';
  }
})();

function formatarCelular(input) {
  let value = input.value.replace(/\D/g, '');
  value = value.slice(0, 11);
  if (value.length === 11) value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  else if (value.length === 10) value = value.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, '($1) $2-$3');
  else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  else if (value.length > 0) value = value.replace(/^(\d{0,2})$/, '($1');
  input.value = value;
}

function contarCaracteres() {
  const textarea = document.getElementById('wa-msg');
  const contador = document.getElementById('contador');
  const max = textarea.getAttribute('maxlength');
  const atual = textarea.value.length;
  contador.textContent = max - atual;
}

const abrirTermos = document.getElementById('abrir-termos');
const fecharTermos = document.getElementById('fechar-termos');
const modal = document.getElementById('modal-termos');

abrirTermos.onclick = (e) => {
  e.preventDefault();
  modal.classList.add('active');
}

fecharTermos.onclick = () => {
  modal.classList.remove('active');
}

modal.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
  }
}
