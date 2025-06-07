import L from 'leaflet';

(function() {
  const originalInitTile = (L.GridLayer.prototype as any)._initTile;
  L.GridLayer.include({
    _initTile: function(tile: HTMLImageElement) {
      originalInitTile.call(this, tile);

      const tileSize = this.getTileSize();

      tile.style.width = tileSize.x + 1 + 'px';
      tile.style.height = tileSize.y + 1 + 'px';
    }
  });
})(); 