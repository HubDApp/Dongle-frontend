/**
 * Portuguese (pt) messages
 */

import type { Messages } from "./en";

export const pt: Messages = {
  common: {
    loading: "Carregando...",
    error: "Erro",
    success: "Sucesso",
    cancel: "Cancelar",
    confirm: "Confirmar",
    save: "Salvar",
    delete: "Excluir",
    edit: "Editar",
    submit: "Enviar",
    close: "Fechar",
    back: "Voltar",
    next: "Próximo",
    search: "Buscar",
    filter: "Filtrar",
    sort: "Ordenar",
    clear: "Limpar",
    clearAll: "Limpar tudo",
    tryAgain: "Tentar novamente",
    learnMore: "Saiba mais",
    viewAll: "Ver tudo",
    loadMore: "Carregar mais",
    home: "Início",
  },

  nav: {
    discover: "Descobrir",
    reviews: "Avaliações",
    verify: "Verificar",
    submitProject: "Enviar projeto",
    profile: "Perfil",
    admin: "Admin",
    documentation: "Documentação",
    analytics: "Analítica",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
  },

  wallet: {
    connect: "Conectar carteira",
    connecting: "Conectando...",
    disconnect: "Desconectar",
    connected: "Conectado",
    wrongNetwork: "Rede incorreta detectada.",
    networkMismatch:
      "Sua carteira Freighter está em {currentNetwork}. Este app exige {expectedNetwork}. Abra o Freighter, vá em Configurações → Rede e mude para {expectedNetwork} antes de enviar transações.",
    expectedNetwork: "Esperada: {network}",
  },

  hero: {
    badge: "Agora na Stellar Testnet",
    title: "A camada de confiança",
    titleHighlight: "para apps Web3",
    subtitle:
      "Dongle é a loja descentralizada que traz transparência às dApps na Stellar. Descubra, avalie e verifique protocolos com confiança on-chain.",
    exploreApps: "Explorar apps",
    poweredBy: "DESENVOLVIDO COM",
    verifiedOnChain: "Verificado on-chain",
    status: "Status",
    reviewsCount: "{count} avaliações",
  },

  features: {
    sectionTitle: "Por que Dongle?",
    sectionSubtitle:
      "Estamos construindo a infraestrutura para um ecossistema descentralizado mais confiável.",
    onChainVerification: {
      title: "Verificação on-chain",
      description:
        "Cada listagem e avaliação é armazenada diretamente na blockchain Stellar, garantindo integridade e resistência à censura.",
    },
    communityReviews: {
      title: "Avaliações da comunidade",
      description:
        "Usuários reais fornecem feedback verificado. Avaliadores ganham reputação com base na precisão e profundidade das contribuições.",
    },
    developerFocused: {
      title: "Focado em desenvolvedores",
      description:
        "Integração simples para listar dApps Stellar e alcançar uma comunidade que valoriza confiança e transparência.",
    },
  },

  cta: {
    title: "Pronto para listar sua aplicação?",
    subtitle:
      "Junte-se ao ecossistema de dApps transparentes na Stellar. Verifique-se e construa confiança com seus usuários hoje.",
  },

  discover: {
    title: "DESCOBRIR",
    subtitle:
      "Explore o ecossistema de aplicações descentralizadas, infraestrutura e ferramentas na Stellar e Soroban.",
    searchPlaceholder: "Buscar projetos por nome ou descrição...",
    filterByTags: "Filtrar por tags",
    addTagsPlaceholder: "Adicione tags para filtrar...",
    allStatus: "Todos os status",
    verified: "Verificado",
    pending: "Pendente",
    unverified: "Não verificado",
    rejected: "Rejeitado",
    highestRated: "Melhor avaliados",
    mostPopular: "Mais populares",
    newest: "Mais recentes",
    noProjectsFound: "Nenhum projeto encontrado",
    noProjectsDescription:
      "Tente ajustar a busca ou os filtros para encontrar o que procura.",
    clearFilters: "Limpar filtros",
    loadingProjects: "Carregando projetos...",
    loadMoreProjects: "Carregar mais projetos",
  },

  projectCard: {
    reviews: "{count} avaliações",
    addedAt: "Adicionado {date}",
    saveProject: "Salvar {name}",
    removeFromSaved: "Remover {name} dos salvos",
    addToComparison: "Adicionar {name} à comparação",
    removeFromComparison: "Remover {name} da comparação",
    maxProjectsReached: "Não é possível adicionar {name}: máximo de 4 projetos",
  },

  projectForm: {
    title: {
      create: "Enviar novo projeto",
      edit: "Editar projeto",
    },
    basicInfo: "Informações básicas",
    projectName: "Nome do projeto",
    projectNamePlaceholder: "Meu dApp incrível",
    description: "Descrição",
    descriptionPlaceholder: "Conte-nos sobre seu projeto...",
    category: "Categoria principal",
    tags: "Tags",
    tagsPlaceholder: "Adicione tags relevantes...",
    websiteUrl: "URL do site",
    websiteUrlPlaceholder: "https://...",
    githubUrl: "URL do repositório (opcional)",
    githubUrlPlaceholder: "https://github.com/owner/repo",
    logoUrl: "URL do logo (opcional)",
    logoUrlPlaceholder: "https://...",
    docsUrl: "URL da documentação (opcional)",
    docsUrlPlaceholder: "https://docs...",
    auditReportUrl: "URL do relatório de auditoria (opcional)",
    bugBountyUrl: "URL do bug bounty (opcional)",
    submitButton: {
      create: "Enviar registro",
      edit: "Atualizar projeto",
      processing: "Processando transação...",
    },
    disclaimer: {
      create:
        "Ao enviar, você concorda em armazenar os detalhes do projeto na rede Stellar. Uma pequena taxa será necessária para o registro on-chain.",
      edit:
        "Ao atualizar, você concorda em atualizar os detalhes do projeto na rede Stellar.",
    },
    duplicateWarning: {
      title: "Possível duplicata detectada",
      description: "Encontramos projetos existentes muito semelhantes ao seu:",
      confirmLabel: "Continuar mesmo assim",
    },
    discardDraft: {
      title: "Descartar rascunho",
      description:
        "Tem certeza de que deseja descartar este rascunho? Alterações não salvas serão perdidas.",
      confirmLabel: "Descartar rascunho",
      cancelLabel: "Manter rascunho",
    },
  },

  reviews: {
    title: "SUAS AVALIAÇÕES",
    subtitle: "Veja o que a comunidade está dizendo sobre as dApps da Stellar.",
    addReview: "Adicionar avaliação",
    editReview: "Editar avaliação",
    yourReviews: "Suas avaliações",
    noReviews: "Ainda não há avaliações. Comece a avaliar projetos!",
    rating: "Nota",
    comment: "Comentário",
    commentPlaceholder: "Compartilhe sua experiência com este projeto...",
    minChars: "Mín.: {count} caracteres",
    postReview: "Publicar avaliação",
    updateReview: "Atualizar avaliação",
    rateStars: "Avaliar com {count} estrela{plural}",
    devOnlyBadge: "SOMENTE DEV",
  },

  verification: {
    title: "Status de verificação",
    searchPlaceholder: "Digite o ID do projeto para verificar o status",
    statuses: {
      none: {
        title: "Não encontrado",
        description: "Nenhuma solicitação de verificação encontrada para este projeto.",
      },
      pending: {
        title: "Revisão pendente",
        description: "A solicitação de verificação está sendo analisada pela comunidade.",
      },
      verified: {
        title: "Verificado",
        description: "Este projeto foi verificado e é considerado confiável.",
      },
      rejected: {
        title: "Rejeitado",
        description: "A solicitação de verificação deste projeto foi rejeitada.",
      },
    },
    projectId: "ID: {id}",
  },

  profile: {
    title: "SEU PERFIL",
    subtitle: "Gerencie sua conta e veja sua atividade no Dongle.",
    accountSummary: "Resumo da conta",
    walletAddress: "Endereço da carteira",
    network: "Rede",
    networkInfo: "Conectado a {network}",
    networkDisclaimer:
      "O Dongle exige Stellar {expectedNetwork} (testnet Soroban). Antes de assinar, confirme que o Freighter está nesta rede em Configurações → Rede. Transações na rede errada são bloqueadas automaticamente.",
    balances: "Saldos",
    activityStats: "Estatísticas de atividade",
    avgRating: "Nota média",
    submitted: "Enviados",
    quickActions: "Ações rápidas",
    browseProjects: "Navegar projetos",
    viewAllReviews: "Ver todas as avaliações",
    savedProjects: "Projetos salvos",
    noSavedProjects: "Nenhum projeto salvo ainda. Favorite projetos para revisitá-los.",
    submittedProjects: "Projetos enviados",
    noSubmittedProjects: "Nenhum projeto enviado ainda.",
    submitFirstProject: "Envie seu primeiro projeto",
    submittedAt: "Enviado {date}",
    rejectionReason: "Motivo da rejeição:",
    clearHistory: "Limpar histórico de visualização",
    clearHistoryConfirm:
      "Isso removerá permanentemente seus projetos vistos recentemente. Esta ação não pode ser desfeita.",
    clearHistoryButton: "Limpar histórico",
    discoverProjects: "Descobrir projetos",
  },

  comparison: {
    title: "Comparar projetos",
    count: "Comparar projetos ({current}/{max})",
    compareNow: "Comparar agora",
    selectAtLeast: "Selecione pelo menos 2 projetos para comparar",
  },

  transaction: {
    phases: {
      preparing: "Preparando",
      signing: "Aguardando assinatura",
      submitting: "Enviando",
      confirming: "Confirmando",
    },
    status: {
      idle: "Pronto",
      inProgress: "Transação em andamento",
      success: "Transação concluída",
      failure: "Transação falhou",
    },
    retry: "Tentar transação novamente",
  },

  errors: {
    somethingWrong: "Algo deu errado",
    somethingWrongIn: "Algo deu errado em {section}",
    unexpectedError: "Ocorreu um erro inesperado. Você pode tentar novamente ou voltar ao início.",
    pageNotFound: "Página não encontrada",
    pageNotFoundDescription: "A página que você procura não existe ou foi movida.",
  },

  footer: {
    tagline:
      "A loja descentralizada para Stellar. Descoberta, avaliações e verificação com transparência on-chain.",
    platform: "Plataforma",
    resources: "Recursos",
    github: "GitHub",
    privacyPolicy: "Política de privacidade",
    termsOfService: "Termos de serviço",
    copyright: "© {year} Dongle Protocol. Todos os direitos reservados.",
  },

  meta: {
    title: "Dongle - Sua loja de apps on-chain",
    description:
      "A loja descentralizada para Stellar. Descoberta, avaliações e verificação com transparência on-chain.",
  },

  legal: {
    lastUpdated: "Última atualização: {date}",
  },

  language: {
    label: "Idioma",
    select: "Selecionar idioma",
    en: "English",
    es: "Español",
    pt: "Português",
    changed: "Idioma atualizado",
    loadError: "Não foi possível carregar as traduções. Exibindo o idioma padrão.",
    invalid: "Idioma não suportado. Usando inglês.",
  },

  notifications: {
    title: "Notificações",
    empty: "Ainda não há notificações",
    markAllRead: "Marcar todas como lidas",
    markRead: "Marcar como lida",
    unread: "{count} não lidas",
    open: "Abrir notificações",
    close: "Fechar notificações",
    viewProject: "Ver projeto",
    viewReview: "Ver avaliação",
    live: "Ao vivo",
    connecting: "Conectando…",
    reconnecting: "Reconectando…",
    offline: "Offline — tentando novamente",
    toastDismissed: "Notificação ocultada",
    types: {
      project_verified: "Projeto verificado",
      project_rejected: "Projeto rejeitado",
      review_approved: "Avaliação aprovada",
      review_rejected: "Avaliação rejeitada",
      verification_evidence_requested: "Evidência de verificação solicitada",
      claim_received: "Reivindicação recebida",
      claim_approved: "Reivindicação aprovada",
      claim_rejected: "Reivindicação rejeitada",
      unknown: "Atualização",
    },
    messages: {
      project_verified: "{projectName} foi verificado.",
      project_rejected: "{projectName} foi rejeitado.",
      review_approved: "Sua avaliação de {projectName} foi aprovada.",
      review_rejected: "Sua avaliação de {projectName} foi rejeitada.",
      verification_evidence_requested: "Evidência adicional é solicitada para {projectName}.",
      claim_received: "Sua reivindicação de {projectName} foi enviada.",
      claim_approved: "Sua reivindicação de {projectName} foi aprovada.",
      claim_rejected: "Sua reivindicação de {projectName} foi rejeitada.",
    },
    errors: {
      streamFailed: "Não foi possível conectar às notificações ao vivo.",
      malformed: "Um aviso inválido foi ignorado.",
      unauthorized: "Entre para receber notificações.",
    },
  },

  analytics: {
    title: "Tendências e analítica",
    subtitle: "Métricas da plataforma a partir de dados de projetos e avaliações.",
    nav: "Analítica",
    trending: "Projetos em alta",
    trendingHint: "Classificados por avaliações por semana no intervalo selecionado.",
    topCategories: "Principais categorias",
    newProjectsWeek: "Novos projetos / semana",
    timeSeries: "Atividade ao longo do tempo",
    totalProjects: "Total de projetos",
    totalReviews: "Total de avaliações",
    verificationRate: "Taxa de verificação",
    averageRating: "Nota média",
    medianReviews: "Mediana de avaliações",
    approvalRate: "Taxa de aprovação de verificação",
    filters: "Filtros",
    range: "Intervalo de datas",
    range7d: "7 dias",
    range30d: "30 dias",
    range90d: "90 dias",
    rangeAll: "Todo o período",
    category: "Categoria",
    allCategories: "Todas as categorias",
    verificationStatus: "Status de verificação",
    allStatuses: "Todos os status",
    exportCsv: "Exportar CSV",
    exporting: "Exportando…",
    exportFailed: "Não foi possível exportar o CSV.",
    lastUpdated: "Última atualização {date} UTC",
    stale: "Exibindo analítica em cache. A atualização está agendada para 00:00 UTC.",
    empty: "Não há dados de analítica para este filtro.",
    loading: "Carregando analítica…",
    loadFailed: "Não foi possível carregar a analítica.",
    retry: "Tentar novamente",
    rpcFailed: "A agregação do Soroban RPC falhou; os dados do catálogo são exibidos.",
    chartProjects: "Projetos",
    chartReviews: "Avaliações",
    chartVerification: "Taxa de verificação",
    reviewsPerWeek: "{count} avaliações/semana",
  },

  auth: {
    signIn: "Entrar",
    signOut: "Sair",
    signInWithGoogle: "Entrar com Google",
    signInWithGitHub: "Entrar com GitHub",
    connectWallet: "Conectar carteira",
    signedInAs: "Conectado como {name}",
    providerGoogle: "Google",
    providerGitHub: "GitHub",
    providerWallet: "Carteira",
    readOnlyBanner:
      "Você está navegando no modo somente leitura. Conecte uma carteira Stellar para publicar on-chain.",
    walletRequiredTitle: "Assinatura da carteira necessária",
    walletRequiredBody:
      "Entrar com Google ou GitHub permite explorar. Publicar avaliações ou listagens ainda exige uma assinatura da carteira Freighter.",
    walletRequiredCta: "Conectar Freighter",
    oauthDenied: "O login foi cancelado.",
    oauthError: "Falha no login. Tente novamente.",
    oauthInvalidState: "Não foi possível verificar o login. Tente novamente.",
    sessionExpired: "Sua sessão expirou. Entre novamente.",
    duplicateAccount: "Já existe uma conta para esta identidade.",
    missingProfile: "O provedor não retornou dados de perfil suficientes para entrar.",
    linkWallet: "Vincular carteira",
    walletLinked: "Carteira vinculada",
    account: "Conta",
  },
};
