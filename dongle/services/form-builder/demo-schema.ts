/**
 * Demo intake form used by the form builder UI and tests.
 * Demonstrates branching: project type reveals different follow-up sections.
 */

import type { FormSchemaSnapshot } from "./types";

export const DEMO_FORM_ID = "project-intake";

export const demoIntakeSchema: FormSchemaSnapshot = {
  formId: DEMO_FORM_ID,
  name: {
    en: "Project Intake",
    es: "Registro de proyecto",
    pt: "Cadastro de projeto",
  },
  description: {
    en: "Tell us about your Stellar project. Follow-up questions depend on your answers.",
    es: "Cuéntanos sobre tu proyecto en Stellar. Las preguntas siguientes dependen de tus respuestas.",
    pt: "Conte-nos sobre seu projeto na Stellar. As próximas perguntas dependem das suas respostas.",
  },
  supportedLocales: ["en", "es", "pt"],
  sections: [
    {
      id: "basics",
      title: {
        en: "Basics",
        es: "Datos básicos",
        pt: "Dados básicos",
      },
      description: {
        en: "Required for every submission.",
        es: "Obligatorio para todos los envíos.",
        pt: "Obrigatório para todos os envios.",
      },
      fieldIds: ["projectName", "projectType", "contactEmail"],
    },
    {
      id: "dapp-details",
      title: {
        en: "dApp details",
        es: "Detalles de la dApp",
        pt: "Detalhes do dApp",
      },
      branched: true,
      fieldIds: ["contractId", "websiteUrl"],
    },
    {
      id: "infra-details",
      title: {
        en: "Infrastructure details",
        es: "Detalles de infraestructura",
        pt: "Detalhes de infraestrutura",
      },
      branched: true,
      fieldIds: ["serviceRegion", "uptimeSla"],
    },
    {
      id: "other-details",
      title: {
        en: "Additional details",
        es: "Detalles adicionales",
        pt: "Detalhes adicionais",
      },
      branched: true,
      fieldIds: ["otherDescription"],
    },
  ],
  fields: [
    {
      id: "projectName",
      type: "text",
      label: {
        en: "Project name",
        es: "Nombre del proyecto",
        pt: "Nome do projeto",
      },
      placeholder: {
        en: "My Stellar app",
        es: "Mi app en Stellar",
        pt: "Meu app na Stellar",
      },
      validation: {
        required: true,
        minLength: 2,
        maxLength: 80,
        messages: {
          required: {
            en: "Project name is required",
            es: "El nombre del proyecto es obligatorio",
            pt: "O nome do projeto é obrigatório",
          },
          minLength: {
            en: "Name must be at least 2 characters",
            es: "El nombre debe tener al menos 2 caracteres",
            pt: "O nome deve ter pelo menos 2 caracteres",
          },
        },
      },
    },
    {
      id: "projectType",
      type: "select",
      label: {
        en: "Project type",
        es: "Tipo de proyecto",
        pt: "Tipo de projeto",
      },
      placeholder: {
        en: "Select a type",
        es: "Selecciona un tipo",
        pt: "Selecione um tipo",
      },
      options: [
        {
          value: "dapp",
          label: { en: "dApp", es: "dApp", pt: "dApp" },
        },
        {
          value: "infrastructure",
          label: {
            en: "Infrastructure",
            es: "Infraestructura",
            pt: "Infraestrutura",
          },
        },
        {
          value: "other",
          label: { en: "Other", es: "Otro", pt: "Outro" },
        },
      ],
      validation: {
        required: true,
        messages: {
          required: {
            en: "Please choose a project type",
            es: "Elige un tipo de proyecto",
            pt: "Escolha um tipo de projeto",
          },
        },
      },
    },
    {
      id: "contactEmail",
      type: "email",
      label: {
        en: "Contact email",
        es: "Correo de contacto",
        pt: "E-mail de contato",
      },
      placeholder: {
        en: "you@example.com",
        es: "tu@ejemplo.com",
        pt: "voce@exemplo.com",
      },
      validation: {
        required: true,
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        messages: {
          required: {
            en: "Email is required",
            es: "El correo es obligatorio",
            pt: "O e-mail é obrigatório",
          },
          pattern: {
            en: "Enter a valid email address",
            es: "Introduce un correo válido",
            pt: "Informe um e-mail válido",
          },
        },
      },
    },
    {
      id: "contractId",
      type: "text",
      label: {
        en: "Soroban contract ID",
        es: "ID del contrato Soroban",
        pt: "ID do contrato Soroban",
      },
      placeholder: {
        en: "C…",
        es: "C…",
        pt: "C…",
      },
      validation: {
        required: true,
        minLength: 56,
        maxLength: 56,
        messages: {
          required: {
            en: "Contract ID is required for dApps",
            es: "El ID del contrato es obligatorio para dApps",
            pt: "O ID do contrato é obrigatório para dApps",
          },
        },
      },
    },
    {
      id: "websiteUrl",
      type: "text",
      label: {
        en: "Website URL",
        es: "URL del sitio",
        pt: "URL do site",
      },
      placeholder: {
        en: "https://…",
        es: "https://…",
        pt: "https://…",
      },
      validation: {
        required: true,
        pattern: "^https?://.+",
        messages: {
          required: {
            en: "Website URL is required",
            es: "La URL del sitio es obligatoria",
            pt: "A URL do site é obrigatória",
          },
          pattern: {
            en: "URL must start with http:// or https://",
            es: "La URL debe empezar por http:// o https://",
            pt: "A URL deve começar com http:// ou https://",
          },
        },
      },
    },
    {
      id: "serviceRegion",
      type: "text",
      label: {
        en: "Primary service region",
        es: "Región principal del servicio",
        pt: "Região principal do serviço",
      },
      placeholder: {
        en: "e.g. EU-West",
        es: "p. ej. EU-West",
        pt: "ex.: EU-West",
      },
      validation: {
        required: true,
        messages: {
          required: {
            en: "Service region is required",
            es: "La región del servicio es obligatoria",
            pt: "A região do serviço é obrigatória",
          },
        },
      },
    },
    {
      id: "uptimeSla",
      type: "number",
      label: {
        en: "Uptime SLA (%)",
        es: "SLA de disponibilidad (%)",
        pt: "SLA de disponibilidade (%)",
      },
      placeholder: {
        en: "99.9",
        es: "99.9",
        pt: "99.9",
      },
      validation: {
        required: true,
        min: 90,
        max: 100,
        messages: {
          required: {
            en: "Uptime SLA is required",
            es: "El SLA de disponibilidad es obligatorio",
            pt: "O SLA de disponibilidade é obrigatório",
          },
          min: {
            en: "SLA must be at least 90%",
            es: "El SLA debe ser al menos 90%",
            pt: "O SLA deve ser pelo menos 90%",
          },
        },
      },
    },
    {
      id: "otherDescription",
      type: "textarea",
      label: {
        en: "Describe your project",
        es: "Describe tu proyecto",
        pt: "Descreva seu projeto",
      },
      placeholder: {
        en: "What are you building?",
        es: "¿Qué estás construyendo?",
        pt: "O que você está construindo?",
      },
      validation: {
        required: true,
        minLength: 20,
        messages: {
          required: {
            en: "Please describe your project",
            es: "Describe tu proyecto",
            pt: "Descreva seu projeto",
          },
          minLength: {
            en: "Please write at least 20 characters",
            es: "Escribe al menos 20 caracteres",
            pt: "Escreva pelo menos 20 caracteres",
          },
        },
      },
    },
  ],
  branchRules: [
    {
      id: "path-dapp",
      pathLabel: {
        en: "dApp path",
        es: "Ruta dApp",
        pt: "Caminho dApp",
      },
      showSectionIds: ["dapp-details"],
      conditions: [
        { fieldId: "projectType", operator: "equals", value: "dapp" },
      ],
    },
    {
      id: "path-infra",
      pathLabel: {
        en: "Infrastructure path",
        es: "Ruta de infraestructura",
        pt: "Caminho de infraestrutura",
      },
      showSectionIds: ["infra-details"],
      conditions: [
        {
          fieldId: "projectType",
          operator: "equals",
          value: "infrastructure",
        },
      ],
    },
    {
      id: "path-other",
      pathLabel: {
        en: "Other path",
        es: "Otra ruta",
        pt: "Outro caminho",
      },
      showSectionIds: ["other-details"],
      conditions: [
        { fieldId: "projectType", operator: "equals", value: "other" },
      ],
    },
  ],
};
