import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export interface StoredUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  plainPasswordFallback?: string;
  role: "ADMIN" | "CLIENT";
  createdAt: string;
  aliases?: string[];
}

// Caminho de persistência em disco para sobreviver a recargas e ambientes serverless
const DISK_FILE = 
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? path.join("/tmp", "las_users.json")
    : path.join(process.cwd(), "src", "data", "users.json");

// Usuários iniciais oficiais pré-configurados (Apenas Lucas Augusto - Dono/Gestor)
const INITIAL_USERS: StoredUser[] = [
  // 1. Lucas Augusto (Proprietário e Barbeiro Gestor Solo)
  {
    id: "barbeiro-lucas",
    name: "Lucas Augusto",
    email: "lucastj609@gmail.com",
    phone: "5569993783204",
    passwordHash: "$2b$10$3nbfFPEGUEz5IOBYGT4GXOax0/yVHF25z9UJHNc8qTYD9aDCU5ulO", // LasStudio#2026
    plainPasswordFallback: "123",
    role: "ADMIN",
    createdAt: "2026-01-01T00:00:00.000Z",
    aliases: ["69993783204", "993783204", "6999378-3204", "(69) 99378-3204"],
  },
];

declare global {
  var __las_users: StoredUser[] | undefined;
}

function loadUsersFromDisk(): StoredUser[] {
  try {
    if (fs.existsSync(DISK_FILE)) {
      const raw = fs.readFileSync(DISK_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Exclui contas legadas de teste (ex: Almir Bastos, cliente-teste)
        return parsed.filter(
          (u) => !u.name?.toLowerCase().includes("almir") && 
                 !u.id?.includes("almir") &&
                 !u.id?.includes("cliente-teste") &&
                 u.email !== "cliente@teste.com"
        );
      }
    }
  } catch (_) {}
  return [];
}

function saveUsersToDisk(users: StoredUser[]): void {
  try {
    const dir = path.dirname(DISK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DISK_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (_) {}
}

export function getAllStoredUsers(): StoredUser[] {
  if (!global.__las_users || global.__las_users.length === 0) {
    const fromDisk = loadUsersFromDisk();
    if (fromDisk.length > 0) {
      global.__las_users = fromDisk;
    } else {
      global.__las_users = [...INITIAL_USERS];
      saveUsersToDisk(global.__las_users);
    }
  }
  // Garante exclusão de legados
  return (global.__las_users || []).filter(
    (u) => !u.name?.toLowerCase().includes("almir") && !u.id?.includes("almir")
  );
}

export function findStoredUserById(id: string): StoredUser | undefined {
  const users = getAllStoredUsers();
  return users.find((u) => u.id === id);
}

export function findStoredUserByEmailOrPhone(identifier: string): StoredUser | undefined {
  if (!identifier) return undefined;
  const users = getAllStoredUsers();
  const trimmed = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, "");

  return users.find((u) => {
    // 1. Comparação de Email
    if (u.email && u.email.toLowerCase() === trimmed) {
      return true;
    }

    // 2. Comparação de Aliases (emails alternativos)
    if (u.aliases && u.aliases.some((a) => a.toLowerCase() === trimmed)) {
      return true;
    }

    // 3. Comparação de Telefone
    if (cleanPhone && u.phone) {
      const uPhoneDigits = u.phone.replace(/\D/g, "");
      if (
        uPhoneDigits === cleanPhone ||
        uPhoneDigits.endsWith(cleanPhone) ||
        cleanPhone.endsWith(uPhoneDigits) ||
        (cleanPhone.length >= 8 && uPhoneDigits.includes(cleanPhone))
      ) {
        return true;
      }
    }

    // 4. Comparação de Aliases de Telefone
    if (cleanPhone && u.aliases) {
      for (const alias of u.aliases) {
        const aliasDigits = alias.replace(/\D/g, "");
        if (
          aliasDigits &&
          (aliasDigits === cleanPhone ||
            aliasDigits.endsWith(cleanPhone) ||
            cleanPhone.endsWith(aliasDigits) ||
            (cleanPhone.length >= 8 && aliasDigits.includes(cleanPhone)))
        ) {
          return true;
        }
      }
    }

    return false;
  });
}

export function upsertStoredUser(data: {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  password?: string;
  role?: "ADMIN" | "CLIENT";
}): StoredUser {
  const users = getAllStoredUsers();
  const formattedEmail = data.email ? data.email.trim().toLowerCase() : null;
  const cleanPhone = data.phone ? data.phone.replace(/\D/g, "") : null;
  const pwd = data.password ? data.password.trim() : "123";

  // Busca se já existe por e-mail ou telefone
  let existingIndex = -1;
  if (formattedEmail || cleanPhone) {
    existingIndex = users.findIndex((u) => {
      if (formattedEmail && u.email && u.email.toLowerCase() === formattedEmail) return true;
      if (cleanPhone && u.phone) {
        const uPhoneDigits = u.phone.replace(/\D/g, "");
        if (uPhoneDigits === cleanPhone || uPhoneDigits.endsWith(cleanPhone) || cleanPhone.endsWith(uPhoneDigits)) {
          return true;
        }
      }
      return false;
    });
  }

  const passwordHash = bcrypt.hashSync(pwd, 10);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    const updated: StoredUser = {
      ...existing,
      name: data.name?.trim() || existing.name,
      email: formattedEmail || existing.email,
      phone: cleanPhone || existing.phone,
      passwordHash: passwordHash,
      plainPasswordFallback: pwd,
    };
    users[existingIndex] = updated;
    global.__las_users = users;
    saveUsersToDisk(users);
    return updated;
  }

  const newUser: StoredUser = {
    id: data.id || `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: data.name?.trim() || "Cliente VIP",
    email: formattedEmail,
    phone: cleanPhone,
    passwordHash: passwordHash,
    plainPasswordFallback: pwd,
    role: data.role || "CLIENT",
    createdAt: new Date().toISOString(),
    aliases: cleanPhone ? [cleanPhone, `(69) ${cleanPhone.slice(-9)}`] : [],
  };

  users.unshift(newUser);
  global.__las_users = users;
  saveUsersToDisk(users);
  return newUser;
}

export function clearAllStoredUsersExceptAdmin(): void {
  global.__las_users = [...INITIAL_USERS];
  saveUsersToDisk(global.__las_users);
}
