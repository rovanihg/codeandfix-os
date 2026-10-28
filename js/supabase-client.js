/**
 * DataService - Camada de Persistência com Autenticação e Fallback Local
 */
const DataService = {
  supabase: null,
  isCloud: false,
  currentUser: null,

  init() {
    const config = this.getConfig();
    if (config.url && config.key && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(config.url, config.key);
        this.isCloud = true;
        return true;
      } catch (err) {
        console.warn('Erro ao conectar ao Supabase:', err);
        this.isCloud = false;
        return false;
      }
    }
    this.isCloud = false;
    return false;
  },

  getConfig() {
    return {
      url: localStorage.getItem('codefix_sp_url') || '',
      key: localStorage.getItem('codefix_sp_key') || ''
    };
  },

  saveConfig(url, key) {
    localStorage.setItem('codefix_sp_url', url.trim());
    localStorage.setItem('codefix_sp_key', key.trim());
    return this.init();
  },

  clearConfig() {
    localStorage.removeItem('codefix_sp_url');
    localStorage.removeItem('codefix_sp_key');
    this.supabase = null;
    this.isCloud = false;
    this.currentUser = null;
  },

  async login(email, password) {
    if (!this.isCloud) return { success: true, offline: true };
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };
    this.currentUser = data.user;
    return { success: true, user: data.user };
  },

  async checkSession() {
    if (!this.isCloud) return false;
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session && session.user) {
      this.currentUser = session.user;
      return true;
    }
    return false;
  },

  async logout() {
    if (this.isCloud && this.supabase) {
      await this.supabase.auth.signOut();
    }
    this.currentUser = null;
  },

  // Operações de OS (Criação e Edição)
  async getOS() {
    if (this.isCloud && this.currentUser) {
      const { data, error } = await this.supabase
          .from('ordens_servico')
          .select('*')
          .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('codefix_os_store') || '[]');
  },

  async saveOS(osData) {
    if (this.isCloud && this.currentUser) {
      osData.user_id = this.currentUser.id;

      // Se tiver id, realiza a atualização (UPDATE)
      if (osData.id) {
        const idAtualizar = osData.id;
        delete osData.id;
        const { error } = await this.supabase
            .from('ordens_servico')
            .update(osData)
            .eq('id', idAtualizar);
        if (!error) return true;
        console.error('Erro ao atualizar OS no Supabase:', error);
      } else {
        // Se não tiver id, realiza inserção (INSERT)
        delete osData.id;
        const { error } = await this.supabase.from('ordens_servico').insert([osData]);
        if (!error) return true;
        console.error('Erro ao inserir OS no Supabase:', error);
      }
    }

    // Fallback LocalStorage
    const list = JSON.parse(localStorage.getItem('codefix_os_store') || '[]');
    if (osData.id) {
      const idx = list.findIndex(item => item.id == osData.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...osData };
      } else {
        list.push(osData);
      }
    } else {
      osData.id = Date.now();
      osData.created_at = new Date().toISOString();
      list.unshift(osData);
    }
    localStorage.setItem('codefix_os_store', JSON.stringify(list));
    return true;
  },

  // Operações do Caixa
  async getCaixa() {
    if (this.isCloud && this.currentUser) {
      const { data, error } = await this.supabase
          .from('livro_caixa')
          .select('*')
          .order('data', { ascending: false });
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('codefix_caixa_store') || '[]');
  },

  async saveLancamento(txData) {
    if (this.isCloud && this.currentUser) {
      txData.user_id = this.currentUser.id;
      delete txData.id;
      const { error } = await this.supabase.from('livro_caixa').insert([txData]);
      if (!error) return true;
      console.error('Erro ao salvar no Caixa:', error);
    }

    const list = JSON.parse(localStorage.getItem('codefix_caixa_store') || '[]');
    txData.id = Date.now();
    list.unshift(txData);
    localStorage.setItem('codefix_caixa_store', JSON.stringify(list));
    return true;
  }
};