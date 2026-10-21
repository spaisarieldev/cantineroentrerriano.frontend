import { Injectable, computed, effect, signal } from '@angular/core';
import { ProductoPublico } from './models';
import { fotoPrincipal } from './http.utils';

export interface ItemCarrito {
  productoId: number;
  nombre: string;
  marca: string;
  variante: string | null;
  imagen: string | null;
  precioPack: number;
  unidadesPorPack: number;
  packsDisponibles: number;
  packs: number;
}

const KEY = 'ce.carrito.v1';

/**
 * Carrito en el front (el backend recalcula precios y total al crear el pedido).
 * El cliente compra en packs; el backend multiplica por UnidadesPorPack.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<ItemCarrito[]>(this.leer());
  readonly abierto = signal(false);
  /** Se incrementa en cada alta para animar el ícono del carrito. */
  readonly pulso = signal(0);

  readonly cantidadPacks = computed(() => this.items().reduce((acc, i) => acc + i.packs, 0));
  readonly total = computed(() => this.items().reduce((acc, i) => acc + i.packs * i.precioPack, 0));
  readonly vacio = computed(() => this.items().length === 0);

  constructor() {
    effect(() => {
      try { localStorage.setItem(KEY, JSON.stringify(this.items())); } catch { /* almacenamiento no disponible */ }
    });
  }

  packsDe(productoId: number): number {
    return this.items().find(i => i.productoId === productoId)?.packs ?? 0;
  }

  agregar(p: ProductoPublico, packs = 1, abrir = true): void {
    if (packs <= 0 || p.packsDisponibles <= 0) return;
    this.items.update(items => {
      const existente = items.find(i => i.productoId === p.id);
      if (existente) {
        return items.map(i => i.productoId === p.id
          ? { ...i, packs: Math.min(i.packs + packs, p.packsDisponibles), packsDisponibles: p.packsDisponibles, precioPack: p.precioPack }
          : i);
      }
      return [...items, {
        productoId: p.id,
        nombre: p.nombre,
        marca: p.marcaNombre,
        variante: p.varianteNombre,
        imagen: fotoPrincipal(p.fotos),
        precioPack: p.precioPack,
        unidadesPorPack: p.unidadesPorPack,
        packsDisponibles: p.packsDisponibles,
        packs: Math.min(packs, p.packsDisponibles),
      }];
    });
    this.pulso.update(n => n + 1);
    if (abrir) this.abierto.set(true);
  }

  setPacks(productoId: number, packs: number): void {
    if (packs <= 0) { this.quitar(productoId); return; }
    this.items.update(items => items.map(i => i.productoId === productoId
      ? { ...i, packs: Math.min(packs, i.packsDisponibles) }
      : i));
  }

  quitar(productoId: number): void {
    this.items.update(items => items.filter(i => i.productoId !== productoId));
  }

  /** Refresca precio y disponibilidad con datos frescos del catálogo. */
  sincronizar(productos: ProductoPublico[]): void {
    const porId = new Map(productos.map(p => [p.id, p]));
    this.items.update(items => items
      .filter(i => porId.has(i.productoId))
      .map(i => {
        const p = porId.get(i.productoId)!;
        return {
          ...i,
          nombre: p.nombre,
          precioPack: p.precioPack,
          unidadesPorPack: p.unidadesPorPack,
          packsDisponibles: p.packsDisponibles,
          imagen: fotoPrincipal(p.fotos),
          packs: Math.min(i.packs, Math.max(p.packsDisponibles, 0)),
        };
      })
      .filter(i => i.packs > 0));
  }

  vaciar(): void {
    this.items.set([]);
  }

  private leer(): ItemCarrito[] {
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}
