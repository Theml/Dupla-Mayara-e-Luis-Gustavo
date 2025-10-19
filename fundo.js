function Fundo(context, imagem) {
  this.context = context;
  this.imagem = imagem;
  this.velocidade = 0; // deslocamento aplicado por frame (já convertido em px/frame no main)
  this.posicaoEmenda = 0; // deslocamento acumulado
  this.drawW = 0; // largura desenhada (cover)
  this.drawH = 0; // altura desenhada (cover)
  this.offsetX = 0; // centralização horizontal se houver corte
  this._calcularDimensoes();
}

Fundo.prototype = {
  _calcularDimensoes: function () {
    const canvas = this.context.canvas;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = this.imagem.width;
    const ih = this.imagem.height;
    if (!iw || !ih) return; // imagem não carregada ainda

    // Escala tipo 'cover' para preencher todo canvas
    const scale = Math.max(cw / iw, ch / ih);
    this.drawW = iw * scale;
    this.drawH = ih * scale;
    this.offsetX = (cw - this.drawW) / 2; // centro horizontal; se quiser alinhar à esquerda, usar 0
  },

  atualizar: function () {
    // Recalcula se canvas mudar (responsivo)
    this._calcularDimensoes();

    this.posicaoEmenda += this.velocidade;
    // Quando deslocamento excede a altura desenhada, reinicia
    if (this.posicaoEmenda > this.drawH) {
      this.posicaoEmenda = 0;
    }
  },

  desenhar: function (offsetY = 0, alpha = 1) {
    const ctx = this.context;
    const img = this.imagem;
    if (!this.drawH) return; // aguarda cálculo
    const prevAlpha = ctx.globalAlpha;
    if (alpha !== 1) ctx.globalAlpha = prevAlpha * alpha;

    // Primeira cópia (acima)
    let posY = this.posicaoEmenda - this.drawH + offsetY;
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      this.offsetX,
      posY,
      this.drawW,
      this.drawH
    );

    // Segunda cópia (corrente)
    posY = this.posicaoEmenda + offsetY;
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      this.offsetX,
      posY,
      this.drawW,
      this.drawH
    );

    if (alpha !== 1) ctx.globalAlpha = prevAlpha; // restaura
  },
};

// Camada simples para sprites decorativos (não faz cover / não repete)
function SpriteLayer(context, imagem, options = {}) {
  this.context = context;
  this.imagem = imagem;
  this.scale = options.scale || 0.35; // fator de escala
  this.xP = options.xP !== undefined ? options.xP : 0.5; // posição relativa (0..1) eixo X
  this.yP = options.yP !== undefined ? options.yP : 0.3; // posição relativa (0..1) eixo Y
  this.velocidadeBase = options.v || 0; // para compatibilidade (não desloca verticalmente)
  this.velocidade = 0;
  this.rotationSpeed = options.rotationSpeed || 0; // radianos por segundo
  this.angle = 0;
}

SpriteLayer.prototype = {
  atualizar: function (dtSeconds = 0) {
    if (this.rotationSpeed) this.angle += this.rotationSpeed * dtSeconds;
  },
  desenhar: function (_offsetY = 0, alpha = 1) {
    const ctx = this.context;
    const img = this.imagem;
    if (!img.width) return;
    const prev = ctx.globalAlpha;
    if (alpha !== 1) ctx.globalAlpha = prev * alpha;
    const w = img.width * this.scale;
    const h = img.height * this.scale;
    const x = (ctx.canvas.width - w) * this.xP;
    const y = (ctx.canvas.height - h) * this.yP;
    if (this.rotationSpeed) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(this.angle);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    if (alpha !== 1) ctx.globalAlpha = prev;
  },
};
