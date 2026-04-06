(function() {
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
      const urlParams = new URLSearchParams(queryString);
      const metricas = urlParams.get('metricas');
      const local = window.location.href.indexOf('127.0.0.1') != -1;

      if (metricas != '1' && !local) {
        console.log('metric')
        const { data, error: errorSelect } = await supabase
          .from('metricas')
          .select('visitas')
          .eq('id', 1)
          .single();

        if (!errorSelect) {
            async function registrarVisita() {
              const res = await fetch('https://api.ipify.org?format=json');
              const { ip } = await res.json();
              const { error } = await supabase
                .from('metricas')
                .update({
                  visitas: data.visitas + 1,
                  ultimo_ip: ip
                })
                .eq('id', 1);
            }
            callMeBot('Visita: ' + ip)
            
            registrarVisita();
        }
      }

      setTimeout(() => {
        // Inicialização e estado de autenticação
        try{ const { data: { session } } = supabase.auth.getSession() } catch (e) {}
        
        try {
          updateAuthUI(session?.user ?? null);
        } catch (error) {}

       /*  try {
          if (session?.user) redirecionarAposLogin(session.user);
          supabase.auth.onAuthStateChange(async (event, session) => {
            updateAuthUI(session?.user ?? null);
            if (event === 'SIGNED_IN' && session?.user) redirecionarAposLogin(session.user);
          });
        } catch (error) {} */
      }, 7000); 
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

      function expToAnos(str) {
        const m = (str || '').match(/\d+/);
        return m ? parseInt(m[0]) : 0;
      }

      async function callMeBot(text) {
        const url = `https://api.callmebot.com/whatsapp.php?source=php&phone=556193872684&apikey=977206&text=Visitante => IP: ${text}`;
        fetch(url);
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
          const { data: cuidador } = await supabase.from('cuidadores').select('id').eq('id', user.id).single();
          if (cuidador) {
            currentUserRole = 'cuidador';
            userRoleSpan.textContent = 'Cuidador';
            userRoleSpan.className = 'badge bg-success text-white';
            document.getElementById('nav-cadastro').classList.add('d-md-inline-flex');
            document.getElementById('nav-cadastro-usuario').classList.remove('d-md-inline-flex');
          } else {
            const { data: usuario } = await supabase.from('usuarios').select('id').eq('id', user.id).single();
            if (usuario) {
              currentUserRole = 'usuario';
              userRoleSpan.textContent = 'Usuário';
              userRoleSpan.className = 'badge bg-info text-dark';
              document.getElementById('nav-cadastro').classList.remove('d-md-inline-flex');
              document.getElementById('nav-cadastro-usuario').classList.add('d-md-inline-flex');
            } else {
              currentUserRole = null;
              userRoleSpan.textContent = 'Sem perfil';
              userRoleSpan.className = 'badge bg-secondary';
            }
          }
        } else {
        //   loginBtn.classList.add('d-md-inline-flex');
          document.getElementById('logout-button').style.display = 'none';
        //   loginBtn.style.display = 'inline-flex';
          userInfo.style.display = 'none';
          currentUserRole = null;
        }
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
      function abrirModalLogin() { modal.style.display = 'flex'; }
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
        const { data, error } = await supabase.from('cuidadores').select('*').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') { console.error('Erro ao verificar perfil:', error); return null; }
        return data;
      }

      async function redirecionarAposLogin(user) {
        if (!user) return;
        const perfil = await verificarPerfilAtivo(user.id);
        if (perfil) {
          await preencherFormularioEdicao(perfil);
          goTo('editar');
        } else {
          // Verifica se é usuário comum
          const { data: usuario } = await supabase.from('usuarios').select('id','nome').eq('id', user.id).single();
          if (user) {
            // showToast('Bem-vindo de volta, ' + usuario.nome + '!');
            goTo('home');
          }
        }
      }

      // Preencher tela de edição (cuidador)
      async function preencherFormularioEdicao(perfil) {
        document.getElementById('edit-nome').value = perfil.nome || '';
        document.getElementById('edit-cidade').value = perfil.cidade || '';
        document.getElementById('edit-whatsapp').value = perfil.whatsapp || '';
        document.getElementById('edit-preco').value = perfil.preco || '';
        document.getElementById('edit-exp').value = perfil.experiencia || 'Menos de 1 ano';
        document.getElementById('edit-sobre').value = perfil.sobre || '';
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
        const cidade = document.getElementById('edit-cidade').value;
        const whatsapp = document.getElementById('edit-whatsapp').value.trim().replace(/\D/g, '');
        const preco = parseFloat(document.getElementById('edit-preco').value);
        const experiencia = document.getElementById('edit-exp').value;
        const sobre = document.getElementById('edit-sobre').value.trim();
        const quero_verificacao = document.getElementById('edit-quero-verificacao').checked;
        const servicos = Array.from(document.querySelectorAll('#edit-servicos-check input:checked')).map(el => el.parentElement.textContent.trim());
        const fotoInput = document.getElementById('edit-foto-input');

        if (!nome || !cidade || !whatsapp || !preco || !sobre) {
          showToast('Preencha todos os campos obrigatórios!', 'danger');
          return;
        }

        const btn = document.getElementById('btn-atualizar');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Atualizando...';

        try {
          let foto_url = window.perfilOriginalFoto || null;
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
          }

          const { error } = await supabase.from('cuidadores').update({
            nome, cidade, whatsapp, preco, experiencia, sobre, servicos, quero_verificacao, foto_url
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

        if (!nome || !cidade || !whatsapp) {
          showToast('Preencha nome, cidade e WhatsApp!', 'danger');
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

          const { error } = await supabase.from('usuarios').insert([{
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
        document.getElementById('p-nome').textContent = c.nome;
        document.getElementById('p-local').innerHTML = `<i class="bi bi-geo-alt me-1"></i>${c.cidade} · ${c.experiencia} de exp.`;
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
        carregarAvaliacoes(c.id);
        visCui(c.id);
      }

      async function visCui(id) {
        // Vistas 
        let queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const metricas = urlParams.get('metricas');
        const local = window.location.href.indexOf('127.0.0.1') != -1;

        if (metricas != '1' && !local) {
          console.log('metric')
          const { data, error: errorSelect } = await supabase
            .from('cuidador_visitas')
            .select('id,visitas')
            .eq('cuidador', id)
            .single();

          if (!errorSelect) {
            const { error } = await supabase
              .from('cuidador_visitas')
              .update({
                visitas: data.visitas + 1
              })
              .eq('id', data.id);
          }
        }
    }
      async function carregarAvaliacoes(id) {
        const el = document.getElementById('p-avaliacoes');
        el.innerHTML = '<div class="text-muted small">Carregando avaliações...</div>';
        const { data, error } = await supabase
            .from('avaliacoes')
            .select(`
            *,
            usuarios (
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
        const { data: usuario } = await supabase.from('usuarios').select('nome').eq('id', session.user.id).single();
        if (!usuario) { showToast('Perfil de usuário não encontrado.', 'danger'); return; }

        const btn = document.getElementById('btn-enviar-avaliacao');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

        // Inserir avaliação (o trigger cuidará da atualização da soma e dos campos do cuidador)
        const { error: insertErr } = await supabase.from('avaliacoes').insert([{
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

        // Atualizar soma
        const { data: somaData } = await supabase
        .from('cuidadores')
        .select('avaliacao, total_reviews')
        .eq('id', cuidadorId)
        .single();

        if (somaData) {
            const novaSoma = 1 + somaData.total_reviews;
            const novaMedia = (somaData.avaliacao + avaliacaoNota) / novaSoma;
            const { error: somaErr } = await supabase
                .from('cuidadores')
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
        // Recarregar o perfil do cuidador para mostrar os dados atualizados
        const { data: cuidadorAtualizado } = await supabase.from('cuidadores').select('*').eq('id', cuidadorId).single();
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
          document.getElementById('wa-info').innerHTML = `<strong>${c.nome}</strong> · Valor a combinar `;
        } else {
          document.getElementById('wa-info').innerHTML = `<strong>${c.nome}</strong> · R$${c.preco}/plantão`;
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
          if (whatsInput.value.length < 15 || nomeInput.value.length < 1) {
            showToast('Você precisa digitar uma mensagem e informar seu nome e um WhatsApp válido para contato.', 'danger');
            return;
          }
          waLink.disabled = true;
          waLink.style.cursor = 'not-allowed';
          waLink.classList.add('opacity-50');
          const originalText = waLink.innerHTML;
          waLink.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
          const msg = encodeURIComponent(waMsg.value);
          const msgCompleta = `*CuidaDF:* %0A ${nomeInput.value} enviou uma mensagem para ${c.nome} 55${c.whatsapp}: %0A ${msg} %0A Podemos conversar? %0A *Meu whatsapp:* ${whatsInput.value}`;

          const cuidadorId = c.id;

          const url = `https://api.callmebot.com/whatsapp.php?source=php&phone=556193872684&apikey=977206&text=${msgCompleta}`;
          fetch(url)
            .then(() => showToast('Mensagem enviada com sucesso!', 'success'))
            .catch(() => showToast('Erro ao enviar mensagem. Tente novamente.', 'danger'))
            .finally(() => {
              waLink.disabled = true;
              waLink.style.cursor = 'not-allowed';
              waLink.classList.add('opacity-50');
              waLink.innerHTML = 'Mensagem enviada!';
            });
            const { error } = await supabase.from('mensagens').insert([{
              cuidador: cuidadorId,
              nome: nomeInput.value,
              whatsapp: whatsInput.value,
              mensagem: waMsg.value
            }]);
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
          });
        }, current ? 160 : 0);
      }

      async function loadCitiesIntoSelect() {
        try {
          let { data: cidades, error } = await supabase.rpc('get_distinct_cidades');
      
          if (error) throw error;
      
          let selectElement = document.getElementById('input-cidade');
          selectElement.innerHTML = '';      
          let defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = 'Qualquer cidade';
          defaultOption.selected = true;
          selectElement.appendChild(defaultOption);
        
          cidades.forEach(cidade_array => {
            let option = document.createElement('option');
            option.value = cidade_array.cidade_nome || cidade_array.cidade; 
            option.textContent = cidade_array.cidade_nome || cidade_array.cidade; 
            selectElement.appendChild(option);
          });
      
          let selectElementLista = document.getElementById('f-cidade');
          selectElementLista.innerHTML = '';      
          let defaultOptionLista = document.createElement('option');
          defaultOptionLista.value = '';
          defaultOptionLista.textContent = 'Todas as cidades';
          defaultOptionLista.selected = true;
          selectElementLista.appendChild(defaultOptionLista);
        
          cidades.forEach(cidade_array => {
            let optionLista = document.createElement('option');
            optionLista.value = cidade_array.cidade_nome || cidade_array.cidade; 
            optionLista.textContent = cidade_array.cidade_nome || cidade_array.cidade; 
            selectElementLista.appendChild(optionLista);
          });
          
        } catch (error) {
          console.error('Erro ao carregar cidades:', error.message);
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
        
        if(current.id == 'screen-home'){
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
            campo = 'cidade';
        if (sorteio == 7) 
            campo = 'created_at';

        sorteio = Math.floor(Math.random() * 2);
        let asc = true;
        if (sorteio == 1) 
            asc = false;

        let query = supabase.from('cuidadores').select('*').order(campo, { ascending: asc }).eq('disponivel', true);

        if (fc) query = query.ilike('cidade', `%${fc.split(',')[0].trim()}%`);
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

          col.innerHTML = `<div class="cuidador-card h-100 p-4"><div class="d-flex align-items-start gap-3 mb-3"><img src="${foto}" class="avatar" alt="${c.nome}" onerror="this.src='https://i.pravatar.cc/200?u=${c.id}'"/><div class="flex-grow-1"><div class="fw-700 mb-1">${c.nome}</div><div class="d-flex flex-wrap gap-1 mb-1">${c.verificado ? '<span class="badge-verificado"><i class="bi bi-patch-check-fill me-1"></i>Verificado</span>' : ''}${c.disponivel ? '<span class="badge-disponivel"><i class="bi bi-circle-fill me-1" style="font-size:.55rem"></i>Disponível</span>' : '<span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.7rem;border-radius:2rem">Indisponível</span>'}</div><div class="stars">${stars(c.avaliacao)} <small class="text-muted ms-1">${(c.avaliacao || 5).toFixed(1)} (${c.total_reviews || 0})</small></div></div></div><div class="small text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${c.cidade}</div><div class="small text-muted mb-3"><i class="bi bi-briefcase me-1"></i>${c.experiencia} de experiência</div><div class="d-flex align-items-center justify-content-between"><div class="price-tag">${P}</div><button class="btn btn-brand btn-sm px-3">Ver perfil <i class="bi bi-arrow-right ms-1"></i></button></div></div>`;
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

      // Cadastro de cuidador (criação)
      async function salvarCadastro() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { showToast('Você precisa estar logado para se cadastrar como cuidador.', 'warning'); abrirModalLogin(); return; }

        const nome = document.getElementById('cad-nome').value.trim();
        const cidade = document.getElementById('cad-cidade').value;
        const whatsapp = document.getElementById('cad-whatsapp').value.trim().replace(/\D/g, '');
        const preco = parseFloat(document.getElementById('cad-preco').value);
        const experiencia = document.getElementById('cad-exp').value;
        const sobre = document.getElementById('cad-sobre').value.trim();
        const quero_verificacao = document.getElementById('cad-quero-verificacao').checked;
        const servicos = Array.from(document.querySelectorAll('#servicos-check input:checked')).map(el => el.parentElement.textContent.trim());
        const fotoInput = document.getElementById('cad-foto-input');

        if (!nome || !cidade || !whatsapp || !preco /* || !fotoInput.files[0] */ || !sobre) {
          showToast('Preencha nome, cidade, WhatsApp, preço e sobre você!', 'danger');
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
        const { error } = await supabase.from('cuidadores').insert([{
          nome, cidade, whatsapp, preco, experiencia, sobre, servicos, quero_verificacao, foto_url,
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
        document.getElementById('perfil-voltar').addEventListener('click', () => goTo('lista'));
        document.getElementById('perfil-contato-desktop').addEventListener('click', () => goTo('whatsapp'));
        document.getElementById('perfil-contato-mobile').addEventListener('click', () => goTo('whatsapp'));
        document.getElementById('cadastro-voltar').addEventListener('click', () => goTo('home'));
        document.getElementById('editar-voltar').addEventListener('click', () => goTo('home'));
        document.getElementById('cadastro-usuario-voltar').addEventListener('click', () => goTo('home'));
        document.getElementById('btn-cadastrar').addEventListener('click', salvarCadastro);
        document.getElementById('btn-atualizar').addEventListener('click', (e) => atualizarPerfil(e));
        document.getElementById('btn-cadastrar-usuario').addEventListener('click', salvarCadastroUsuario);
        document.getElementById('wa-voltar').addEventListener('click', () => goTo('perfil'));
        ['f-cidade', 'f-preco', 'f-disp', 'f-exp'].forEach(id => document.getElementById(id).addEventListener('change', carregarLista));
        
        let queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const intc = urlParams.get('intc');

        if (intc != '' && intc != null) {
          if (localStorage.getItem('intencao') == 'c') {
            handleSouCuidador();
          }
          if (localStorage.getItem('intencao') == 'u') {
            handleSouUsuario();
          }
          let queryString = new URL(window.location.href);
          queryString.searchParams.delete('intc');
          window.history.replaceState({}, '', queryString);          
        }

        // Botões "Sou Cuidador" e "Sou Usuário"
        async function handleSouCuidador() {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            localStorage.setItem('intencao', 'c');
            abrirModalLogin(); 
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
          const { data: usuario } = await supabase.from('usuarios').select('id').eq('id', session.user.id).single();
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
        document.getElementById('nav-cadastro-usuario').addEventListener('click', handleSouUsuario);
        document.getElementById('hero-cadastro-usuario').addEventListener('click', handleSouUsuario);

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
        loadCitiesIntoSelect();
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if(session != undefined) {
        updateAuthUI(session?.user ?? null);
      }
      // localStorage.removeItem('intencao');
      bindEvents();
      document.getElementById('screen-home').style.display = 'block';
    }
  })();

  function formatarCelular(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.slice(0, 11);
    if (value.length > 6) value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
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

  abrirTermos.onclick = (e)=>{
    e.preventDefault();
    modal.classList.add('active');
  }

  fecharTermos.onclick = ()=>{
    modal.classList.remove('active');
  }

  modal.onclick = (e)=>{
    if(e.target === modal){
      modal.classList.remove('active');
    }
  }
  