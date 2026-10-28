import L from 'leaflet';

export type CameraReason =
  | 'initial-fit'
  | 'reset-view'
  | 'select-office'
  | 'select-district'
  | 'filter-district'
  | 'tour'
  | 'location'
  | 'user-gesture';

const ALLOWED_REASONS = new Set<CameraReason>([
  'initial-fit',
  'reset-view',
  'select-office',
  'select-district',
  'filter-district',
  'tour',
  'location',
  'user-gesture',
]);

export interface MoveOptions extends L.ZoomPanOptions {
  animate?: boolean;
  duration?: number;
  padding?: L.PointTuple;
  maxZoom?: number;
}

export class CameraController {
  private map: L.Map | null = null;
  private isUserInteracting = false;
  private lastReason: CameraReason | null = null;

  public attach(map: L.Map) {
    this.map = map;
    this.bindInteractions();
  }

  public detach() {
    this.unbindInteractions();
    this.map = null;
  }

  private onInteractionStart = () => {
    this.isUserInteracting = true;
  };

  private onInteractionEnd = () => {
    // Small delay to let inertia settle
    setTimeout(() => {
      this.isUserInteracting = false;
    }, 150);
  };

  private bindInteractions() {
    if (!this.map) return;
    this.map.on('dragstart', this.onInteractionStart);
    this.map.on('dragend', this.onInteractionEnd);
    this.map.on('touchmove', this.onInteractionStart);
    this.map.on('touchend', this.onInteractionEnd);
  }

  private unbindInteractions() {
    if (!this.map) return;
    this.map.off('dragstart', this.onInteractionStart);
    this.map.off('dragend', this.onInteractionEnd);
    this.map.off('touchmove', this.onInteractionStart);
    this.map.off('touchend', this.onInteractionEnd);
  }

  public canMove(reason: CameraReason): boolean {
    if (!this.map) return false;

    if (!ALLOWED_REASONS.has(reason)) {
      console.warn(`[CameraController] Blocked camera move: unauthorized reason "${reason}".`);
      return false;
    }

    if (this.isUserInteracting && reason !== 'user-gesture') {
      console.warn(`[CameraController] Ignored programmatic camera move: user gesture currently active. Reason: "${reason}".`);
      return false;
    }

    return true;
  }

  public fitBounds(bounds: L.LatLngBoundsExpression, options: L.FitBoundsOptions = {}, reason: CameraReason) {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    this.map.fitBounds(bounds, options);
  }

  public flyTo(latlng: L.LatLngExpression, zoom?: number, options: MoveOptions = {}, reason: CameraReason = 'select-office') {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.map.setView(latlng, zoom ?? this.map.getZoom());
    } else {
      this.map.flyTo(latlng, zoom, {
        animate: true,
        duration: 0.6,
        ...options,
      });
    }
  }

  public setView(latlng: L.LatLngExpression, zoom: number, options: L.ZoomPanOptions = {}, reason: CameraReason) {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    this.map.setView(latlng, zoom, options);
  }

  public panTo(latlng: L.LatLngExpression, options: L.PanOptions = {}, reason: CameraReason) {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    this.map.panTo(latlng, options);
  }

  public zoomIn(reason: CameraReason = 'user-gesture') {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    this.map.zoomIn();
  }

  public zoomOut(reason: CameraReason = 'user-gesture') {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    this.map.zoomOut();
  }

  public resetView(bounds: L.LatLngBoundsExpression, options: L.FitBoundsOptions = {}, reason: CameraReason = 'reset-view') {
    if (!this.canMove(reason) || !this.map) return;
    this.lastReason = reason;
    this.map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 8,
      ...options,
    });
  }

  public getLastReason(): CameraReason | null {
    return this.lastReason;
  }
}
