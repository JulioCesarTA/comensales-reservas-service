/** Subgrafo de Apollo Federation de comensales y reservas: estudiantes, becas e ingreso con QR (SPEC §4). */
export const ESQUEMA = /* GraphQL */ `
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  type Beca {
    tieneBeca: Boolean!
    tipo: String
    cupoRacionesMes: Int
    racionesUsadasMes: Int
    cubreHoy: Boolean
    vigenteDesde: String
    vigenteHasta: String
  }

  type Estudiante @key(fields: "id") @key(fields: "registroUniv") {
    id: ID!
    registroUniv: String!
    nombre: String!
    email: String
    telefono: String
    beca: Beca!
  }

  type ValidacionQr {
    ok: Boolean!
    motivo: String
    reservaId: String
  }

  type Query {
    estudiantes: [Estudiante!]!
    estudiante(id: ID!): Estudiante
    beca(estudianteId: ID!): Beca!
  }

  type Mutation {
    asignarBeca(estudianteId: ID!, tipo: String!, mesesVigencia: Int!): Beca!
    validarQr(qr: String!): ValidacionQr!
  }
`;
