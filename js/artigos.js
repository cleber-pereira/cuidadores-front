// ==========================================================
// artigos.js — lógica das páginas artigos.html (listagem) e
// artigo.html (detalhe), no mesmo padrão usado em funcoes.js
// para as vagas, porém com páginas próprias e URL amigável.
// ==========================================================
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const PAGE_SIZE = 10;
  const CHAVE_ESTADO_LISTA = 'cuidadf_artigos_estado';

  function init() {
    const supabase = window.supabase.createClient(
      'https://duoobpxovvpxfgvvghgk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1b29icHhvdnZweGZndnZnaGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDcyMjMsImV4cCI6MjA4OTY4MzIyM30.NcqCsxqs-1LeS6RLb_UbLv7AmehsgrRJqTnEcthSEY8'
    );

    // -------------------- utilitários --------------------
    function slugNome(nome) {
      if (!nome) return '';
      return nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    function obterDiretorioAtual() {
      const caminho = window.location.pathname;
      return caminho.substring(0, caminho.lastIndexOf('/') + 1);
    }

    // Gera o link amigável e ABSOLUTO do artigo (usado no href dos cards e no compartilhamento)
    function gerarLinkArtigo(artigo) {
      const segundaParteId = (artigo.id || '').split('-')[1] || artigo.id || '';
      const aliasArtigo = `${slugNome(artigo.titulo)}-${segundaParteId}`;
      return `${window.location.origin}${obterDiretorioAtual()}artigo.html?a=${aliasArtigo}`;
    }

    // Toast flutuante simples, independente de Bootstrap, usado nas páginas de artigos
    function mostrarToast(msg, tipo = 'success') {
      let el = document.getElementById('artigos-toast-flutuante');
      if (!el) {
        el = document.createElement('div');
        el.id = 'artigos-toast-flutuante';
        document.body.appendChild(el);
      }
      el.className = `artigos-toast ${tipo}`;
      el.textContent = msg;
      // força reflow para reiniciar a transição caso o toast já esteja visível
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(el._timeoutId);
      el._timeoutId = setTimeout(() => el.classList.remove('show'), 3000);
    }

    // Compartilha o artigo via Web Share API (mobile) com fallback de copiar o link
    async function compartilharArtigo(artigo) {
      const link = gerarLinkArtigo(artigo);

      if (navigator.share) {
        try {
          await navigator.share({ title: artigo.titulo, text: 'Confira este artigo do CuidaDF:', url: link });
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
          mostrarToast('Link do artigo copiado!');
        } catch (e) {
          mostrarToast('Não foi possível copiar o link.', 'danger');
        }
        document.body.removeChild(temp);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
          mostrarToast('Link do artigo copiado!');
        }).catch(copiarFallback);
      } else {
        copiarFallback();
      }
    }

    function resumirTexto(texto, limite = 140) {
      if (!texto) return '';
      const semTags = String(texto).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (semTags.length <= limite) return semTags;
      const cortado = semTags.slice(0, limite);
      const ultimoEspaco = cortado.lastIndexOf(' ');
      return cortado.slice(0, ultimoEspaco > 0 ? ultimoEspaco : limite) + '…';
    }

    function formatarData(dataStr) {
      if (!dataStr) return '';
      try {
        const d = new Date(dataStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch (e) {
        return '';
      }
    }

    function showToast(msg) {
      // Página independente do index.html: sem componente de toast,
      // então usamos um alerta simples embutido no topo do conteúdo.
      const el = document.getElementById('artigos-alerta');
      if (!el) { console.warn(msg); return; }
      el.textContent = msg;
      el.classList.remove('d-none');
    }

    // Resolve ?a=slug-id para o registro real (mesmo princípio de obterVagaPorAlias)
    async function obterArtigoPorAlias(aliasParam) {
      const { data, error } = await supabase
        .from('c_artigos')
        .select('id,titulo')
        .eq('publicado', true);

      if (error || !data) return null;

      const encontrado = data.find((item) => {
        const segundaParteId = item.id.split('-')[1] || item.id;
        const aliasItem = `${slugNome(item.titulo)}-${segundaParteId}`;
        return aliasItem === aliasParam;
      });

      return encontrado ? encontrado.id : null;
    }

    // -------------------- página de listagem (artigos.html) --------------------
    const containerLista = document.getElementById('artigos-lista-cards');
    if (containerLista) {
      initListagem();
    }

    async function initListagem() {
      const paginacaoEl = document.getElementById('artigos-paginacao');

      const params = new URLSearchParams(window.location.search);
      let paginaAtual = parseInt(params.get('p') || '1', 10) || 1;
      let scrollRestaurar = null;
      let artigoIdRestaurar = null;

      // Se o usuário está voltando da página de detalhe, restaura página + posição exata
      try {
        const estadoSalvo = sessionStorage.getItem(CHAVE_ESTADO_LISTA);
        if (estadoSalvo) {
          const estado = JSON.parse(estadoSalvo);
          if (estado && estado.pagina) {
            paginaAtual = estado.pagina;
            scrollRestaurar = estado.scrollY;
            artigoIdRestaurar = estado.artigoId;
          }
          sessionStorage.removeItem(CHAVE_ESTADO_LISTA);
        }
      } catch (e) { /* ignora estado corrompido */ }

      await carregarPagina(paginaAtual, { restaurarScroll: scrollRestaurar, artigoDestaque: artigoIdRestaurar });

      async function carregarPagina(pagina, opcoes = {}) {
        containerLista.innerHTML = `
          <div class="col-12 text-center py-5">
            <div class="spinner-border text-success" role="status"></div>
            <div class="text-muted mt-3 small">Carregando artigos...</div>
          </div>`;

        const de = (pagina - 1) * PAGE_SIZE;
        const ate = de + PAGE_SIZE - 1;

        const { data: artigos, count, error } = await supabase
          .from('c_artigos')
          .select('id,titulo,resumo,imagem_capa,autor,categoria,data_publicacao', { count: 'exact' })
          .eq('publicado', true)
          .order('data_publicacao', { ascending: false })
          .range(de, ate);

        if (error) {
          containerLista.innerHTML = `<div class="col-12"><div class="alert alert-danger">Erro ao carregar artigos: ${error.message}</div></div>`;
          return;
        }

        if (!artigos || artigos.length === 0) {
          containerLista.innerHTML = `
            <div class="col-12 text-center py-5">
              <i class="bi bi-journal-text fs-1 text-muted"></i>
              <p class="mt-3 text-muted">Nenhum artigo publicado no momento.</p>
            </div>`;
          paginacaoEl.innerHTML = '';
          return;
        }

        paginaAtual = pagina;

        // Atualiza a URL (?p=N) sem recarregar a página, mantendo a navegação compartilhável
        const novaUrl = new URL(window.location.href);
        novaUrl.searchParams.set('p', pagina);
        window.history.replaceState({}, '', novaUrl);

        containerLista.innerHTML = '';
        artigos.forEach((a) => {
          const col = document.createElement('div');
          col.className = 'col-md-6 col-lg-4';
          col.innerHTML = `
            <a href="${gerarLinkArtigo(a)}" class="text-decoration-none" data-artigo-card="${a.id}">
              <div class="artigo-card h-100">
                <div class="artigo-card-img" style="background-image:url('${a.imagem_capa || ''}')"></div>
                <div class="p-3">
                  ${a.categoria ? `<span class="artigo-categoria-chip mb-2 d-inline-block">${a.categoria}</span>` : ''}
                  <h5 class="artigo-card-titulo mb-2">${a.titulo}</h5>
                  <p class="small text-muted mb-3">${resumirTexto(a.resumo, 110)}</p>
                  <div class="artigo-card-meta small text-muted">
                    ${a.autor ? `<span><i class="bi bi-person me-1"></i>${a.autor}</span>` : ''}
                    <span class="ms-2"><i class="bi bi-calendar3 me-1"></i>${formatarData(a.data_publicacao)}</span>
                  </div>
                </div>
              </div>
            </a>`;

          col.querySelector('[data-artigo-card]').addEventListener('click', () => {
            // Salva exatamente onde o usuário estava (página + rolagem + qual artigo clicou)
            try {
              sessionStorage.setItem(CHAVE_ESTADO_LISTA, JSON.stringify({
                pagina: paginaAtual,
                scrollY: window.scrollY,
                artigoId: a.id
              }));
            } catch (e) { /* localStorage/sessionStorage indisponível: navega normalmente */ }
          });

          containerLista.appendChild(col);
        });

        renderPaginacao(pagina, Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)));

        if (opcoes.restaurarScroll != null) {
          // Aguarda o layout (imagens etc.) assentar antes de rolar para a posição salva
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.scrollTo({ top: opcoes.restaurarScroll, behavior: 'auto' });
              if (opcoes.artigoDestaque) {
                const cardRestaurado = containerLista.querySelector(`[data-artigo-card="${opcoes.artigoDestaque}"]`);
                if (cardRestaurado) {
                  const cartaoVisual = cardRestaurado.querySelector('.artigo-card');
                  cartaoVisual.classList.add('artigo-card-destaque');
                  setTimeout(() => cartaoVisual.classList.remove('artigo-card-destaque'), 1600);
                }
              }
            }, 60);
          });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }

      function renderPaginacao(pagina, totalPaginas) {
        if (totalPaginas <= 1) { paginacaoEl.innerHTML = ''; return; }

        const itens = [];
        itens.push(paginaBtn('«', pagina - 1, pagina === 1));

        const janela = 2;
        let inicio = Math.max(1, pagina - janela);
        let fim = Math.min(totalPaginas, pagina + janela);
        if (inicio > 1) { itens.push(paginaBtn('1', 1)); if (inicio > 2) itens.push(reticencias()); }
        for (let i = inicio; i <= fim; i++) itens.push(paginaBtn(String(i), i, false, i === pagina));
        if (fim < totalPaginas) { if (fim < totalPaginas - 1) itens.push(reticencias()); itens.push(paginaBtn(String(totalPaginas), totalPaginas)); }

        itens.push(paginaBtn('»', pagina + 1, pagina === totalPaginas));

        paginacaoEl.innerHTML = `<nav aria-label="Paginação de artigos"><ul class="pagination justify-content-center mb-0">${itens.join('')}</ul></nav>`;

        paginacaoEl.querySelectorAll('[data-pagina]').forEach((el) => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            const p = parseInt(el.getAttribute('data-pagina'), 10);
            if (p >= 1 && p <= totalPaginas && p !== pagina) carregarPagina(p);
          });
        });
      }

      function paginaBtn(label, pagina, desabilitado = false, ativo = false) {
        return `<li class="page-item ${desabilitado ? 'disabled' : ''} ${ativo ? 'active' : ''}">
          <a class="page-link" href="#" data-pagina="${pagina}">${label}</a>
        </li>`;
      }
      function reticencias() {
        return `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      }
    }

    // -------------------- página de detalhe (artigo.html) --------------------
    const containerDetalhe = document.getElementById('artigo-detalhe');
    if (containerDetalhe) {
      initDetalhe();
    }

    async function initDetalhe() {
      const params = new URLSearchParams(window.location.search);
      const aliasParam = params.get('a');

      const carregando = document.getElementById('artigo-carregando');
      const naoEncontrado = document.getElementById('artigo-nao-encontrado');
      const btnVoltar = document.getElementById('artigo-voltar');

      if (btnVoltar) {
        btnVoltar.addEventListener('click', () => { window.location.href = 'artigos.html'; });
      }

      if (!aliasParam) {
        mostrarNaoEncontrado();
        return;
      }

      const artigoId = await obterArtigoPorAlias(aliasParam);
      if (!artigoId) {
        mostrarNaoEncontrado();
        return;
      }

      const { data: artigo, error } = await supabase
        .from('c_artigos')
        .select('*')
        .eq('id', artigoId)
        .eq('publicado', true)
        .single();

      if (error || !artigo) {
        mostrarNaoEncontrado();
        return;
      }

      renderArtigo(artigo);

      const btnCompartilhar = document.getElementById('artigo-compartilhar');
      if (btnCompartilhar) btnCompartilhar.addEventListener('click', () => compartilharArtigo(artigo));

      // Incrementa visualizações de forma assíncrona, sem travar a renderização
      supabase.rpc('incrementar_visualizacao_artigo', { artigo_id: artigo.id }).then(() => { });

      function renderArtigo(a) {
        if (carregando) carregando.classList.add('d-none');
        containerDetalhe.classList.remove('d-none');

        document.title = `${a.titulo} | CuidaDF`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', a.meta_descricao || resumirTexto(a.resumo || a.conteudo, 155));

        const capaEl = document.getElementById('artigo-capa');
        if (capaEl) {
          if (a.imagem_capa) { capaEl.style.backgroundImage = `url('${a.imagem_capa}')`; }
          else { capaEl.classList.add('d-none'); }
        }

        setTexto('artigo-categoria', a.categoria);
        setTexto('artigo-titulo', a.titulo);
        setTexto('artigo-autor', a.autor);
        setTexto('artigo-data', formatarData(a.data_publicacao));
        setTexto('artigo-tempo-leitura', a.tempo_leitura_min ? `${a.tempo_leitura_min} min de leitura` : '');

        const conteudoEl = document.getElementById('artigo-conteudo');
        if (conteudoEl) conteudoEl.innerHTML = a.conteudo || '';

        const tagsEl = document.getElementById('artigo-tags');
        if (tagsEl) {
          tagsEl.innerHTML = (a.tags || []).map(t => `<span class="service-chip me-1 mb-1">${t}</span>`).join('');
        }
      }

      function setTexto(id, valor) {
        const el = document.getElementById(id);
        if (!el) return;
        if (!valor) { el.classList.add('d-none'); return; }
        el.textContent = valor;
      }

      function mostrarNaoEncontrado() {
        if (carregando) carregando.classList.add('d-none');
        if (naoEncontrado) naoEncontrado.classList.remove('d-none');
      }
    }
  }
})();
