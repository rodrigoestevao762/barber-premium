# Barber Premium 💈

Projeto base / template ultra-premium para barbearias de alto padrão, desenvolvido com **Next.js 16**, **Tailwind CSS**, **Framer Motion**, **Prisma ORM** e **NextAuth**.

Criado a partir da versão estável e consagrada de 7 de setembro (deploy original), totalmente desacoplado e pronto para novas implantações e personalizações.

---

## ✨ Principais Funcionalidades

- **Design Awwwards-Level**:
  - Hero com Parallax, slider de imagens e textos com máscara animada.
  - Seção *A Experiência* com transições cinematográficas e alta performance.
  - Bento grid interativo para apresentação dos serviços.
  - Marquee contínuo com estética refinada.
  - Microinterações e botões magnéticos com Framer Motion.

- **Sistema de Agendamento**:
  - Modal interativo com seleção de serviços, data, barbeiro e horário.
  - Redirecionamento e fallback para lista de espera / WhatsApp.

- **Painel do Cliente**:
  - Histórico de cortes e agendamentos.
  - Agendamento rápido com um clique ("Repetir Corte").

- **Gestão & Fechamento de Caixa**:
  - Dashboard financeiro por barbeiro e visão geral do estabelecimento.
  - Fechamento de caixa com conferência de faturamento bruto/líquido e despesas.
  - Gerenciamento de clientes e agendamentos com filtros por data.

---

## 🚀 Como Executar

### 1. Clonar ou abrir o projeto
```bash
cd barber-premium
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e preencha com as credenciais do seu banco de dados:
```bash
cp .env.example .env
```

Campos necessários no `.env`:
- `DATABASE_URL`: URL com pgbouncer para conexões de pooling (PostgreSQL/Supabase).
- `DATABASE_URL_UNPOOLED`: URL direta (sem pgbouncer) para migrações Prisma.
- `NEXTAUTH_SECRET`: Chave secreta aleatória para assinatura de tokens JWT.
- `NEXTAUTH_URL`: URL do projeto (ex: `http://localhost:3000` em desenvolvimento).

### 3. Instalar Dependências e Gerar o Prisma
```bash
npm install
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 5. Build de Produção
```bash
npm run build
npm run start
```
