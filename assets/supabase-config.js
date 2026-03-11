const SUPABASE_URL = 'https://dkcrjvpbkdvrbgifhnhm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrY3JqdnBia2R2cmJnaWZobmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQ1MjUsImV4cCI6MjA4ODgzMDUyNX0.1yHpk4qWFaSL2D_PrTQ3_kuBNavUoCVKAP_T5yIGDgI';

// Verifica se a biblioteca do Supabase foi carregada corretamente via CDN
if (typeof window.supabase === 'undefined') {
    console.error('❌ ERRO: A biblioteca Supabase não foi carregada. Verifique sua conexão ou se há bloqueadores de anúncios (AdBlock) ativos.');
} else {
    // Inicializa o cliente Supabase com um nome único para evitar conflitos
    try {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase Client inicializado com sucesso.');
    } catch (e) {
        console.error('❌ Erro ao inicializar Supabase Client:', e);
    }
}
