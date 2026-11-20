export class Campaign {
  constructor(){this.reset();}
  reset(){this.night=1;this.wins=[null,null,null];this.screen='menu';}
  get total(){return this.wins.reduce((sum,n)=>sum+(n??0),0);}
  intro(){this.screen='intro';}
  start(){this.screen='playing';}
  finish(game){if(game.night!==this.night)throw new Error('Wrong campaign night');if(!['won','lost'].includes(game.state))throw new Error('Night has not ended');if(game.state==='won')this.wins[this.night-1]=game.score;this.screen=game.state==='won'&&this.night===3?'dawn':'result';}
  next(){if(this.wins[this.night-1]===null||this.night>=3)return false;this.night++;this.intro();return true;}
  retry(){this.wins[this.night-1]=null;this.start();}
}
