import inventoryRepository from "../../modules/inventory/inventory.repository.mjs";
import requestsRepository from "../../modules/requests/requests.repository.mjs";
import reservationsRepository from "../../modules/reservations/reservations.repository.mjs";

export function seedInventory() {
  const schoolId = "esc-1";
  const userId = "usr-server";

  // 1. Artículos de Inventario / Materiales
  const items = [
    {
      id: "inv-001",
      name: "Proyector Láser Epson PowerLite",
      code: "PROY-01",
      description: "Proyector WXGA 4000 lúmenes para aulas y salón de actos",
      category: "tecnologia",
      brand: "Epson",
      model: "EB-L200F",
      serialNumber: "EPS-98214",
      quantity: 3,
      minQuantity: 2,
      unit: "unidad",
      location: "Server Central - Estante A1",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-002",
      name: "Switch Gigabit 24 Puertos TP-Link",
      code: "NET-02",
      description: "Switch administrable para laboratorios de informática",
      category: "tecnologia",
      brand: "TP-Link",
      model: "TL-SG1024D",
      serialNumber: "TPL-44321",
      quantity: 0,
      minQuantity: 2,
      unit: "unidad",
      location: "Server Central - Rack 2",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-003",
      name: "Cable HDMI 2.0 (10 metros)",
      code: "CAB-03",
      description: "Cable mallado de alta velocidad para proyectores y smart TVs",
      category: "material",
      brand: "Vention",
      model: "HD-10M",
      serialNumber: null,
      quantity: 1,
      minQuantity: 5,
      unit: "unidad",
      location: "Server Central - Cajonera C3",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-004",
      name: "Kit Arduino UNO R3 con Sensores",
      code: "ARD-04",
      description: "Kit didáctico de robótica y sensores para taller de 4to año",
      category: "equipamiento",
      brand: "Elegoo / Arduino",
      model: "Starter Kit v2",
      serialNumber: "ARD-004-SET",
      quantity: 16,
      minQuantity: 8,
      unit: "kit",
      location: "Laboratorio de Robótica - Armario 1",
      spaceId: "lab-robotica",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-005",
      name: "Osciloscopio Digital Hantek DSO5102P",
      code: "INST-05",
      description: "Osciloscopio 2 canales 100MHz para laboratorio de electrónica",
      category: "equipamiento",
      brand: "Hantek",
      model: "DSO5102P",
      serialNumber: "HTK-77881",
      quantity: 2,
      minQuantity: 1,
      unit: "unidad",
      location: "Laboratorio de Electrónica",
      spaceId: "lab-elect",
      status: "en_uso",
      schoolId
    },
    {
      id: "inv-006",
      name: "Bobina Cable UTP Cat6 (305m)",
      code: "CAB-06",
      description: "Bobina 100% cobre para tendido de red institucional",
      category: "material",
      brand: "Furukawa",
      model: "Gigalan Cat6",
      serialNumber: "FUR-90812",
      quantity: 4,
      minQuantity: 2,
      unit: "bobina",
      location: "Server Central - Depósito B",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-007",
      name: "Adaptador USB-C a HDMI / VGA",
      code: "ADAP-07",
      description: "Adaptadores multipuerto para notebooks de docentes",
      category: "tecnologia",
      brand: "Ugreen",
      model: "CM478",
      serialNumber: null,
      quantity: 0,
      minQuantity: 3,
      unit: "unidad",
      location: "Server Central - Mostrador",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-008",
      name: "Soldador de Estaño 60W con Punta Cerámica",
      code: "HERR-08",
      description: "Soldador tipo lápiz para talleres de electrónica y mantenimiento",
      category: "herramienta",
      brand: "Goot",
      model: "KS-60R",
      serialNumber: null,
      quantity: 2,
      minQuantity: 6,
      unit: "unidad",
      location: "Taller de Mantenimiento - Panel 4",
      spaceId: "taller-mant",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-009",
      name: "Tester Digital de Red RJ45 / RJ11",
      code: "HERR-09",
      description: "Comprobador de continuidad de cables de red con generador de tono",
      category: "herramienta",
      brand: "Proskit",
      model: "MT-7058",
      serialNumber: "PSK-33120",
      quantity: 3,
      minQuantity: 2,
      unit: "unidad",
      location: "Server Central - Maletín Herramientas",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-010",
      name: "Gabinete Rack Mural 9U 19 Pulgadas",
      code: "MOB-10",
      description: "Gabinete con puerta de vidrio y cerradura para sala de servidores",
      category: "mobiliario",
      brand: "Totem",
      model: "W9U-600",
      serialNumber: null,
      quantity: 1,
      minQuantity: 1,
      unit: "unidad",
      location: "Server Central - Sala de Comunicaciones",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-011",
      name: "Pinza Crimpeadora RJ45 / RJ11 con Pelacables",
      code: "HERR-11",
      description: "Herramienta de crimpado profesional para conectores de red",
      category: "herramienta",
      brand: "Proskit",
      model: "CP-376VR",
      serialNumber: null,
      quantity: 5,
      minQuantity: 3,
      unit: "unidad",
      location: "Server Central - Maletín Herramientas",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-012",
      name: "Conectores RJ45 Cat6 Blindados (Bolsa x100)",
      code: "MAT-12",
      description: "Conectores modulares con guía metálica para cable de red Cat6",
      category: "material",
      brand: "Furukawa",
      model: "RJ45-FTP",
      serialNumber: null,
      quantity: 8,
      minQuantity: 5,
      unit: "bolsa",
      location: "Server Central - Depósito B",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-013",
      name: "Router Inalámbrico Doble Banda AC1200",
      code: "NET-13",
      description: "Router Wi-Fi Gigabit para aulas de laboratorio y talleres",
      category: "tecnologia",
      brand: "TP-Link",
      model: "Archer C6",
      serialNumber: "TPL-99231",
      quantity: 2,
      minQuantity: 2,
      unit: "unidad",
      location: "Server Central - Estante A2",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-014",
      name: "Fuente de Alimentación Regulable 30V 5A",
      code: "INST-14",
      description: "Fuente de laboratorio digital con display dual voltaje/corriente",
      category: "equipamiento",
      brand: "Yihua",
      model: "305D",
      serialNumber: "YIH-12044",
      quantity: 4,
      minQuantity: 2,
      unit: "unidad",
      location: "Laboratorio de Electrónica",
      spaceId: "lab-elect",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-015",
      name: "Multímetro Digital Autorango True RMS",
      code: "INST-15",
      description: "Tester digital profesional con medición de temperatura y capacitancia",
      category: "equipamiento",
      brand: "Uni-T",
      model: "UT61E+",
      serialNumber: "UNT-88712",
      quantity: 6,
      minQuantity: 3,
      unit: "unidad",
      location: "Laboratorio de Electrónica",
      spaceId: "lab-elect",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-016",
      name: "Monitor LED 24 Pulgadas IPS Full HD",
      code: "TEC-16",
      description: "Monitor para puestos de administración y servidores",
      category: "tecnologia",
      brand: "LG",
      model: "24MP400",
      serialNumber: "LG-240192",
      quantity: 3,
      minQuantity: 2,
      unit: "unidad",
      location: "Server Central - Mostrador",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-017",
      name: "Patch Cord Cat6 UTP 2m Azul (Pack x10)",
      code: "MAT-17",
      description: "Cables de interconexión directa para racks y puestos de trabajo",
      category: "material",
      brand: "Vention",
      model: "PC-CAT6-2M",
      serialNumber: null,
      quantity: 12,
      minQuantity: 6,
      unit: "pack",
      location: "Server Central - Cajonera C2",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-018",
      name: "Placa Arduino MEGA 2560 R3",
      code: "ARD-18",
      description: "Microcontrolador con 54 pines digitales para proyectos de 6to año",
      category: "equipamiento",
      brand: "Arduino Original",
      model: "MEGA 2560",
      serialNumber: "ARD-MEGA-01",
      quantity: 0,
      minQuantity: 4,
      unit: "unidad",
      location: "Laboratorio de Robótica - Armario 2",
      spaceId: "lab-robotica",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-019",
      name: "Pistola de Aire Caliente Desoldadora 750W",
      code: "HERR-19",
      description: "Estación de retrabajo SMD para reparación de placas y circuitos",
      category: "herramienta",
      brand: "Yihua",
      model: "858D",
      serialNumber: "YIH-858-09",
      quantity: 2,
      minQuantity: 2,
      unit: "unidad",
      location: "Taller de Mantenimiento - Panel 4",
      spaceId: "taller-mant",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-020",
      name: "UPS / Estabilizador de Tensión 1500VA",
      code: "TEC-20",
      description: "Sistema ininterrumpido de potencia para servidores de gestión escolar",
      category: "tecnologia",
      brand: "APC",
      model: "BX1500M",
      serialNumber: "APC-1500-44",
      quantity: 1,
      minQuantity: 1,
      unit: "unidad",
      location: "Server Central - Sala de Comunicaciones",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-021",
      name: "Estantería Metálica Reforzada 5 Niveles",
      code: "MOB-21",
      description: "Estantería industrial para almacenamiento de herramientas e insumos",
      category: "mobiliario",
      brand: "Mecalux",
      model: "EST-5N",
      serialNumber: null,
      quantity: 3,
      minQuantity: 2,
      unit: "unidad",
      location: "Server Central - Depósito B",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-022",
      name: "Cinta Aisladora PVC Negra (Pack x10)",
      code: "MAT-22",
      description: "Insumo técnico para cableado eléctrico y de señal",
      category: "material",
      brand: "3M",
      model: "Temflex 1700",
      serialNumber: null,
      quantity: 15,
      minQuantity: 8,
      unit: "pack",
      location: "Server Central - Cajonera C1",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-023",
      name: "Sensor Ultrasónico HC-SR04 (Pack x5)",
      code: "ARD-23",
      description: "Sensores de distancia para prácticas de robótica móvil",
      category: "equipamiento",
      brand: "Elegoo",
      model: "HC-SR04-5P",
      serialNumber: null,
      quantity: 7,
      minQuantity: 5,
      unit: "pack",
      location: "Laboratorio de Robótica - Armario 1",
      spaceId: "lab-robotica",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-024",
      name: "Juego de Destornilladores de Precisión 24 en 1",
      code: "HERR-24",
      description: "Kit magnético para apertura y service de notebooks y proyectores",
      category: "herramienta",
      brand: "Xiaomi / Wiha",
      model: "Precision Set",
      serialNumber: "XIA-2401",
      quantity: 4,
      minQuantity: 2,
      unit: "kit",
      location: "Server Central - Maletín Herramientas",
      spaceId: "server-1",
      status: "disponible",
      schoolId
    },
    {
      id: "inv-025",
      name: "Placa Raspberry Pi 4 Model B (4GB RAM)",
      code: "TEC-25",
      description: "Microordenador para proyectos IoT y servidor de pruebas",
      category: "tecnologia",
      brand: "Raspberry Pi Foundation",
      model: "Pi 4B 4GB",
      serialNumber: "RPI-4B-9021",
      quantity: 5,
      minQuantity: 3,
      unit: "unidad",
      location: "Laboratorio de Robótica - Armario 2",
      spaceId: "lab-robotica",
      status: "disponible",
      schoolId
    }
  ];

  for (const item of items) {
    inventoryRepository.createItem({
      ...item,
      createdBy: userId
    });
  }

  // 2. Movimientos Recientes de Stock
  const now = new Date();
  const dateOffset = (days, hours = 0) => {
    const d = new Date(now.getTime() - (days * 24 * 3600 * 1000) - (hours * 3600 * 1000));
    return d.toISOString();
  };

  const movements = [
    {
      id: "mov-001",
      itemId: "inv-001",
      type: "ingreso",
      quantity: 2,
      fromSpaceId: null,
      toSpaceId: "server-1",
      notes: "Ingreso de proyectores nuevos según orden de compra institucional #1042",
      schoolId,
      createdBy: "usr-server",
      createdAt: dateOffset(0, 2)
    },
    {
      id: "mov-002",
      itemId: "inv-003",
      type: "egreso",
      quantity: 3,
      fromSpaceId: "server-1",
      toSpaceId: "lab-informatica",
      notes: "Entrega de cables para renovación de cableado en Laboratorio 2",
      schoolId,
      createdBy: "usr-server",
      createdAt: dateOffset(0, 5)
    },
    {
      id: "mov-003",
      itemId: "inv-008",
      type: "egreso",
      quantity: 4,
      fromSpaceId: "server-1",
      toSpaceId: "taller-mant",
      notes: "Asignación de soldadores al grupo de práctica de 5to año",
      schoolId,
      createdBy: "usr-server",
      createdAt: dateOffset(1, 3)
    },
    {
      id: "mov-004",
      itemId: "inv-006",
      type: "ingreso",
      quantity: 2,
      fromSpaceId: null,
      toSpaceId: "server-1",
      notes: "Recepción de bobinas Cat6 para ampliación de conectividad",
      schoolId,
      createdBy: "usr-server",
      createdAt: dateOffset(2, 6)
    },
    {
      id: "mov-005",
      itemId: "inv-002",
      type: "transferencia",
      quantity: 1,
      fromSpaceId: "server-1",
      toSpaceId: "lab-elect",
      notes: "Traslado de switch para reemplazo preventivo",
      schoolId,
      createdBy: "usr-server",
      createdAt: dateOffset(3, 4)
    },
    {
      id: "mov-006",
      itemId: "inv-005",
      type: "ajuste",
      quantity: 1,
      fromSpaceId: null,
      toSpaceId: "lab-elect",
      notes: "Revisión anual y calibración completada en Laboratorio",
      schoolId,
      createdBy: "usr-server",
      createdAt: dateOffset(4, 8)
    }
  ];

  for (const m of movements) {
    inventoryRepository.createMovement(m);
  }

  // 3. Solicitudes Pendientes y en Gestión
  const requests = [
    {
      id: "req-001",
      title: "Reposición de cables HDMI para Laboratorios",
      description: "Se requieren 4 cables HDMI de 10 metros para reemplazar conexiones defectuosas en los proyectores de Aulas 12 y 14.",
      type: "material",
      priority: "alta",
      status: "pendiente",
      requesterId: "usr-docente-1",
      sector: "Informática y Taller",
      itemId: "inv-003",
      schoolId,
      dueDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0],
      createdAt: dateOffset(1, 2)
    },
    {
      id: "req-002",
      title: "Instalación de Switch de red adicional",
      description: "Instalar y configurar switch de 24 bocas en la sala de profesores para conectar impresoras en red y puestos docentes.",
      type: "tecnologia",
      priority: "urgente",
      status: "pendiente",
      requesterId: "usr-preceptor-1",
      sector: "Preceptoría / Docencia",
      itemId: "inv-002",
      schoolId,
      dueDate: new Date(now.getTime() + 1 * 24 * 3600 * 1000).toISOString().split("T")[0],
      createdAt: dateOffset(2, 4)
    },
    {
      id: "req-003",
      title: "Solicitud de adaptadores USB-C a HDMI",
      description: "Docentes de programación solicitan adaptadores para las netbooks institucionales del turno tarde.",
      type: "recurso",
      priority: "normal",
      status: "en_progreso",
      requesterId: "usr-jefearea-1",
      sector: "Jefatura de Área",
      itemId: "inv-007",
      schoolId,
      dueDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000).toISOString().split("T")[0],
      createdAt: dateOffset(3, 1)
    },
    {
      id: "req-004",
      title: "Mantenimiento preventivo de osciloscopios",
      description: "Calibración y limpieza de puntas de prueba para los equipos del taller de electrónica.",
      type: "mantenimiento",
      priority: "baja",
      status: "resuelta",
      requesterId: "usr-docente-2",
      sector: "Electrónica",
      itemId: "inv-005",
      schoolId,
      dueDate: dateOffset(1),
      createdAt: dateOffset(5, 0)
    }
  ];

  for (const req of requests) {
    requestsRepository.create(req);
  }

  // 4. Reservas de Recursos
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().split("T")[0];
  const nextWeekStr = new Date(now.getTime() + 4 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const reservations = [
    {
      id: "res-001",
      resourceType: "recurso",
      resourceId: "inv-001",
      ownerId: "usr-docente-1",
      date: todayStr,
      startTime: "09:00",
      endTime: "11:30",
      purpose: "Presentación de proyectos integradores - Aula Magna",
      status: "confirmada",
      schoolId
    },
    {
      id: "res-002",
      resourceType: "recurso",
      resourceId: "inv-004",
      ownerId: "usr-docente-2",
      date: todayStr,
      startTime: "14:00",
      endTime: "16:40",
      purpose: "Práctica de sensado de temperatura con microcontroladores",
      status: "pendiente",
      schoolId
    },
    {
      id: "res-003",
      resourceType: "espacio",
      resourceId: "lab-robotica",
      ownerId: "usr-jefearea-1",
      date: tomorrowStr,
      startTime: "08:30",
      endTime: "12:00",
      purpose: "Taller intensivo de programación de robots para olimpiadas",
      status: "confirmada",
      schoolId
    },
    {
      id: "res-004",
      resourceType: "recurso",
      resourceId: "inv-005",
      ownerId: "usr-docente-1",
      date: nextWeekStr,
      startTime: "13:30",
      endTime: "15:30",
      purpose: "Medición de señales PWM y fuentes de alimentación conmutadas",
      status: "pendiente",
      schoolId
    }
  ];

  for (const r of reservations) {
    reservationsRepository.create(r);
  }
}
