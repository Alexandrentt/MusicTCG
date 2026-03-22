# 🚀 GUÍA RÁPIDA DE MIGRACIÓN

## 🎯 **PREGUNTA: ¿Necesito reiniciar la base de datos?**

### **❌ NO - El sistema actualiza automáticamente sin perder datos**

---

## ⚡ **Comandos Rápidos**

```bash
# 1. Verificar estado actual
npm run migration:check

# 2. Migración segura (recomendado)
npm run migration:safe

# 3. Ver resultados
npm run migration:status

# 4. Si algo falla (emergency only)
npm run migration:rollback
```

---

## 📋 **¿Qué hace la migración?**

### **✅ SE ACTUALIZA:**
- Habilidades de las cartas (nuevas habilidades procedurales)
- Keywords de las cartas
- Versión de migración

### **🛡️ SE PRESERVA:**
- IDs de cartas
- Datos de usuarios
- Colecciones
- Historial
- Stats básicos (ATK/DEF/costo)

### **❌ NO SE TOCA:**
- Cartas Mythic (diseño manual)
- Datos de usuarios
- Transacciones

---

## 🎯 **Resultados Esperados**

```
ANTES:
- Bronze: 0-1 habilidades clásicas
- Silver: 1 habilidad clásica  
- Gold: 1-2 habilidades clásicas
- Platinum: 2 habilidades clásicas
- Mythic: Diseño manual

DESPUÉS:
- Bronze: 1 habilidad procedural única
- Silver: 1-2 habilidades procedurales
- Gold: 2 habilidades procedurales
- Platinum: 3 habilidades procedurales  
- Mythic: Diseño manual (sin cambios)
```

---

## 📊 **Tiempo Estimado**

```
📦 1000 cartas: ~30 segundos
📦 5000 cartas: ~2-3 minutos  
📦 10000 cartas: ~5-7 minutos
```

---

## 🚨 **Si Algo Falla**

```bash
# Ver errores
npm run migration:logs

# Rollback a versión anterior
npm run migration:rollback

# Contactar soporte con logs
```

---

## ✅ **Verificación Post-Migración**

```bash
# Test del motor procedural
npm run test:procedural

# Verificar estado final
npm run migration:status

# Revisar logs de éxito
npm run migration:logs
```

---

**🎵 Listo para usar en minutos, no en horas!**
