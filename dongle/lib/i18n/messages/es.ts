/**
 * Spanish (es) messages
 */

import type { Messages } from "./en";

export const es: Messages = {
  common: {
    loading: "Cargando...",
    error: "Error",
    success: "Éxito",
    cancel: "Cancelar",
    confirm: "Confirmar",
    save: "Guardar",
    delete: "Eliminar",
    edit: "Editar",
    submit: "Enviar",
    close: "Cerrar",
    back: "Atrás",
    next: "Siguiente",
    search: "Buscar",
    filter: "Filtrar",
    sort: "Ordenar",
    clear: "Limpiar",
    clearAll: "Limpiar todo",
    tryAgain: "Intentar de nuevo",
    learnMore: "Más información",
    viewAll: "Ver todo",
    loadMore: "Cargar más",
    home: "Inicio",
  },

  nav: {
    discover: "Descubrir",
    reviews: "Reseñas",
    verify: "Verificar",
    submitProject: "Publicar proyecto",
    profile: "Perfil",
    admin: "Admin",
    documentation: "Documentación",
    analytics: "Analítica",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
  },

  wallet: {
    connect: "Conectar billetera",
    connecting: "Conectando...",
    disconnect: "Desconectar",
    connected: "Conectado",
    wrongNetwork: "Red incorrecta detectada.",
    networkMismatch:
      "Tu billetera Freighter está en {currentNetwork}. Esta aplicación requiere {expectedNetwork}. Abre Freighter, ve a Ajustes → Red y cambia a {expectedNetwork} antes de enviar transacciones.",
    expectedNetwork: "Esperada: {network}",
  },

  hero: {
    badge: "Ahora en Stellar Testnet",
    title: "La capa de confianza",
    titleHighlight: "para apps Web3",
    subtitle:
      "Dongle es la tienda descentralizada que aporta transparencia a las dApps en Stellar. Descubre, reseña y verifica protocolos con confianza on-chain.",
    exploreApps: "Explorar apps",
    poweredBy: "IMPULSADO POR",
    verifiedOnChain: "Verificado on-chain",
    status: "Estado",
    reviewsCount: "{count} reseñas",
  },

  features: {
    sectionTitle: "¿Por qué Dongle?",
    sectionSubtitle:
      "Construimos la infraestructura para un ecosistema descentralizado más confiable.",
    onChainVerification: {
      title: "Verificación on-chain",
      description:
        "Cada listado y reseña se almacena directamente en la blockchain de Stellar, garantizando integridad y resistencia a la censura.",
    },
    communityReviews: {
      title: "Reseñas de la comunidad",
      description:
        "Usuarios reales aportan comentarios verificados. Los reseñadores ganan reputación según la precisión y profundidad de sus contribuciones.",
    },
    developerFocused: {
      title: "Enfoque en desarrolladores",
      description:
        "Integración sencilla para listar dApps de Stellar y llegar a una comunidad que valora la confianza y la transparencia.",
    },
  },

  cta: {
    title: "¿Listo para listar tu aplicación?",
    subtitle:
      "Únete al ecosistema de dApps transparentes en Stellar. Verifícate y genera confianza con tus usuarios hoy.",
  },

  discover: {
    title: "DESCUBRIR",
    subtitle:
      "Explora el ecosistema de aplicaciones descentralizadas, infraestructura y herramientas en Stellar y Soroban.",
    searchPlaceholder: "Buscar proyectos por nombre o descripción...",
    filterByTags: "Filtrar por etiquetas",
    addTagsPlaceholder: "Añadir etiquetas para filtrar...",
    allStatus: "Todos los estados",
    verified: "Verificado",
    pending: "Pendiente",
    unverified: "No verificado",
    rejected: "Rechazado",
    highestRated: "Mejor valorados",
    mostPopular: "Más populares",
    newest: "Más recientes",
    noProjectsFound: "No se encontraron proyectos",
    noProjectsDescription:
      "Prueba a ajustar la búsqueda o los filtros para encontrar lo que buscas.",
    clearFilters: "Limpiar filtros",
    loadingProjects: "Cargando proyectos...",
    loadMoreProjects: "Cargar más proyectos",
  },

  projectCard: {
    reviews: "{count} reseñas",
    addedAt: "Añadido {date}",
    saveProject: "Guardar {name}",
    removeFromSaved: "Quitar {name} de guardados",
    addToComparison: "Añadir {name} a la comparación",
    removeFromComparison: "Quitar {name} de la comparación",
    maxProjectsReached: "No se puede añadir {name}: máximo 4 proyectos",
  },

  projectForm: {
    title: {
      create: "Enviar nuevo proyecto",
      edit: "Editar proyecto",
    },
    basicInfo: "Información básica",
    projectName: "Nombre del proyecto",
    projectNamePlaceholder: "Mi dApp increíble",
    description: "Descripción",
    descriptionPlaceholder: "Cuéntanos sobre tu proyecto...",
    category: "Categoría principal",
    tags: "Etiquetas",
    tagsPlaceholder: "Añade etiquetas relevantes...",
    websiteUrl: "URL del sitio web",
    websiteUrlPlaceholder: "https://...",
    githubUrl: "URL del repositorio (opcional)",
    githubUrlPlaceholder: "https://github.com/owner/repo",
    logoUrl: "URL del logo (opcional)",
    logoUrlPlaceholder: "https://...",
    docsUrl: "URL de documentación (opcional)",
    docsUrlPlaceholder: "https://docs...",
    auditReportUrl: "URL del informe de auditoría (opcional)",
    bugBountyUrl: "URL del bug bounty (opcional)",
    submitButton: {
      create: "Enviar registro",
      edit: "Actualizar proyecto",
      processing: "Procesando transacción...",
    },
    disclaimer: {
      create:
        "Al enviar, aceptas que los detalles del proyecto se almacenen en la red Stellar. Se requerirá una pequeña comisión para el registro on-chain.",
      edit:
        "Al actualizar, aceptas que los detalles del proyecto se actualicen en la red Stellar.",
    },
    duplicateWarning: {
      title: "Posible duplicado detectado",
      description: "Encontramos proyectos existentes muy similares al tuyo:",
      confirmLabel: "Continuar de todos modos",
    },
    discardDraft: {
      title: "Descartar borrador",
      description:
        "¿Seguro que quieres descartar este borrador? Se perderán los cambios no guardados.",
      confirmLabel: "Descartar borrador",
      cancelLabel: "Conservar borrador",
    },
  },

  reviews: {
    title: "TUS RESEÑAS",
    subtitle: "Mira lo que dice la comunidad sobre las dApps de Stellar.",
    addReview: "Añadir reseña",
    editReview: "Editar reseña",
    yourReviews: "Tus reseñas",
    noReviews: "Aún no hay reseñas. ¡Empieza a reseñar proyectos!",
    rating: "Puntuación",
    comment: "Comentario",
    commentPlaceholder: "Comparte tu experiencia con este proyecto...",
    minChars: "Mín.: {count} caracteres",
    postReview: "Publicar reseña",
    updateReview: "Actualizar reseña",
    rateStars: "Valorar con {count} estrella{plural}",
    devOnlyBadge: "SOLO DEV",
  },

  verification: {
    title: "Estado de verificación",
    searchPlaceholder: "Introduce el ID del proyecto para consultar el estado",
    statuses: {
      none: {
        title: "No encontrado",
        description: "No hay una solicitud de verificación para este proyecto.",
      },
      pending: {
        title: "Pendiente de revisión",
        description: "La solicitud de verificación está siendo revisada por la comunidad.",
      },
      verified: {
        title: "Verificado",
        description: "Este proyecto ha sido verificado y se considera de confianza.",
      },
      rejected: {
        title: "Rechazado",
        description: "La solicitud de verificación de este proyecto fue rechazada.",
      },
    },
    projectId: "ID: {id}",
  },

  profile: {
    title: "TU PERFIL",
    subtitle: "Gestiona tu cuenta y consulta tu actividad en Dongle.",
    accountSummary: "Resumen de la cuenta",
    walletAddress: "Dirección de billetera",
    network: "Red",
    networkInfo: "Conectado a {network}",
    networkDisclaimer:
      "Dongle requiere Stellar {expectedNetwork} (testnet de Soroban). Antes de firmar, confirma que Freighter está en esta red en Ajustes → Red. Las transacciones en la red incorrecta se bloquean automáticamente.",
    balances: "Saldos",
    activityStats: "Estadísticas de actividad",
    avgRating: "Puntuación media",
    submitted: "Enviados",
    quickActions: "Acciones rápidas",
    browseProjects: "Explorar proyectos",
    viewAllReviews: "Ver todas las reseñas",
    savedProjects: "Proyectos guardados",
    noSavedProjects: "Aún no hay proyectos guardados. Guarda proyectos para volver a ellos.",
    submittedProjects: "Proyectos enviados",
    noSubmittedProjects: "Aún no has enviado proyectos.",
    submitFirstProject: "Envía tu primer proyecto",
    submittedAt: "Enviado {date}",
    rejectionReason: "Motivo del rechazo:",
    clearHistory: "Borrar historial de visualización",
    clearHistoryConfirm:
      "Esto eliminará de forma permanente tus proyectos vistos recientemente. Esta acción no se puede deshacer.",
    clearHistoryButton: "Borrar historial",
    discoverProjects: "Descubrir proyectos",
  },

  comparison: {
    title: "Comparar proyectos",
    count: "Comparar proyectos ({current}/{max})",
    compareNow: "Comparar ahora",
    selectAtLeast: "Selecciona al menos 2 proyectos para comparar",
  },

  transaction: {
    phases: {
      preparing: "Preparando",
      signing: "Esperando firma",
      submitting: "Enviando",
      confirming: "Confirmando",
    },
    status: {
      idle: "Listo",
      inProgress: "Transacción en curso",
      success: "Transacción completada",
      failure: "Transacción fallida",
    },
    retry: "Reintentar transacción",
  },

  errors: {
    somethingWrong: "Algo salió mal",
    somethingWrongIn: "Algo salió mal en {section}",
    unexpectedError: "Ocurrió un error inesperado. Puedes reintentar o volver al inicio.",
    pageNotFound: "Página no encontrada",
    pageNotFoundDescription: "La página que buscas no existe o se ha movido.",
  },

  footer: {
    tagline:
      "La tienda descentralizada para Stellar. Descubrimiento, reseñas y verificación con transparencia on-chain.",
    platform: "Plataforma",
    resources: "Recursos",
    github: "GitHub",
    privacyPolicy: "Política de privacidad",
    termsOfService: "Términos de servicio",
    copyright: "© {year} Dongle Protocol. Todos los derechos reservados.",
  },

  meta: {
    title: "Dongle - Tu tienda de apps on-chain",
    description:
      "La tienda descentralizada para Stellar. Descubrimiento, reseñas y verificación con transparencia on-chain.",
  },

  legal: {
    lastUpdated: "Última actualización: {date}",
  },

  language: {
    label: "Idioma",
    select: "Seleccionar idioma",
    en: "English",
    es: "Español",
    pt: "Português",
    changed: "Idioma actualizado",
    loadError: "No se pudieron cargar las traducciones. Se muestra el idioma predeterminado.",
    invalid: "Idioma no compatible. Se usará inglés.",
  },

  notifications: {
    title: "Notificaciones",
    empty: "Aún no hay notificaciones",
    markAllRead: "Marcar todas como leídas",
    markRead: "Marcar como leída",
    unread: "{count} sin leer",
    open: "Abrir notificaciones",
    close: "Cerrar notificaciones",
    viewProject: "Ver proyecto",
    viewReview: "Ver reseña",
    live: "En vivo",
    connecting: "Conectando…",
    reconnecting: "Reconectando…",
    offline: "Sin conexión — reintentando",
    toastDismissed: "Notificación oculta",
    types: {
      project_verified: "Proyecto verificado",
      project_rejected: "Proyecto rechazado",
      review_approved: "Reseña aprobada",
      review_rejected: "Reseña rechazada",
      verification_evidence_requested: "Se solicita evidencia de verificación",
      claim_received: "Reclamación recibida",
      claim_approved: "Reclamación aprobada",
      claim_rejected: "Reclamación rechazada",
      unknown: "Actualización",
    },
    messages: {
      project_verified: "{projectName} ha sido verificado.",
      project_rejected: "{projectName} fue rechazado.",
      review_approved: "Tu reseña de {projectName} fue aprobada.",
      review_rejected: "Tu reseña de {projectName} fue rechazada.",
      verification_evidence_requested: "Se solicita evidencia adicional para {projectName}.",
      claim_received: "Tu reclamación de {projectName} fue enviada.",
      claim_approved: "Tu reclamación de {projectName} fue aprobada.",
      claim_rejected: "Tu reclamación de {projectName} fue rechazada.",
    },
    errors: {
      streamFailed: "No se pudo conectar a las notificaciones en vivo.",
      malformed: "Se ignoró un aviso con formato no válido.",
      unauthorized: "Inicia sesión para recibir notificaciones.",
    },
  },

  analytics: {
    title: "Tendencias y analítica",
    subtitle: "Métricas de la plataforma a partir de proyectos y reseñas.",
    nav: "Analítica",
    trending: "Proyectos en tendencia",
    trendingHint: "Ordenados por reseñas por semana en el rango seleccionado.",
    topCategories: "Categorías principales",
    newProjectsWeek: "Proyectos nuevos / semana",
    timeSeries: "Actividad en el tiempo",
    totalProjects: "Total de proyectos",
    totalReviews: "Total de reseñas",
    verificationRate: "Tasa de verificación",
    averageRating: "Puntuación media",
    medianReviews: "Mediana de reseñas",
    approvalRate: "Tasa de aprobación de verificación",
    filters: "Filtros",
    range: "Rango de fechas",
    range7d: "7 días",
    range30d: "30 días",
    range90d: "90 días",
    rangeAll: "Todo el tiempo",
    category: "Categoría",
    allCategories: "Todas las categorías",
    verificationStatus: "Estado de verificación",
    allStatuses: "Todos los estados",
    exportCsv: "Exportar CSV",
    exporting: "Exportando…",
    exportFailed: "No se pudo exportar el CSV.",
    lastUpdated: "Última actualización {date} UTC",
    stale: "Mostrando analítica en caché. La actualización está programada a las 00:00 UTC.",
    empty: "No hay datos de analítica para este filtro.",
    loading: "Cargando analítica…",
    loadFailed: "No se pudo cargar la analítica.",
    retry: "Reintentar",
    rpcFailed: "Falló la agregación de Soroban RPC; se muestran los datos del catálogo.",
    chartProjects: "Proyectos",
    chartReviews: "Reseñas",
    chartVerification: "Tasa de verificación",
    reviewsPerWeek: "{count} reseñas/semana",
  },

  auth: {
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    signInWithGoogle: "Iniciar sesión con Google",
    signInWithGitHub: "Iniciar sesión con GitHub",
    connectWallet: "Conectar billetera",
    signedInAs: "Sesión iniciada como {name}",
    providerGoogle: "Google",
    providerGitHub: "GitHub",
    providerWallet: "Billetera",
    readOnlyBanner:
      "Estás navegando en modo de solo lectura. Conecta una billetera Stellar para publicar on-chain.",
    walletRequiredTitle: "Se requiere firma de billetera",
    walletRequiredBody:
      "Iniciar sesión con Google o GitHub te permite explorar. Publicar reseñas o listados sigue requiriendo una firma de Freighter.",
    walletRequiredCta: "Conectar Freighter",
    oauthDenied: "El inicio de sesión fue cancelado.",
    oauthError: "El inicio de sesión falló. Inténtalo de nuevo.",
    oauthInvalidState: "No se pudo verificar el inicio de sesión. Inténtalo de nuevo.",
    sessionExpired: "Tu sesión expiró. Inicia sesión de nuevo.",
    duplicateAccount: "Ya existe una cuenta para esta identidad.",
    missingProfile: "El proveedor no devolvió suficientes datos de perfil para iniciar sesión.",
    linkWallet: "Vincular billetera",
    walletLinked: "Billetera vinculada",
    account: "Cuenta",
  },

  sync: {
    offline: "Estás sin conexión",
    offlineHint: "Algunas funciones pueden no funcionar. Comprueba tu conexión a internet.",
    reconnecting: "Reconectando…",
    syncing: "Sincronizando cambios en cola…",
    synced: "Todos los cambios están sincronizados",
    failed: "Error de sincronización",
    failedHint: "Algunos cambios no se pudieron sincronizar. Se reintentarán automáticamente.",
    retry: "Reintentar",
    backOnline: "¡Ya estás en línea!",
    pendingCount: "{count} esperando sincronización",
    requiresConnection: "Conéctate a internet para continuar.",
  },
};
