// v2 configs — shot-level timelines (fast cuts + motion + kinetic text). Reuses existing footage.
const R = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels';
const C = `${R}/clips`, S = `${R}/shots`;

module.exports = {
  stockrush: {
    title:'Stock Rush', url:'investingformummies.com',
    theme:{ a:'#0c1410', b:'#060a08', accA:'#00e676', accB:'#34c6b3' },
    audio:`${C}/sd_stockrush.mp4`, endDur:2.3,
    endLines:['Stock','Rush'], endCta:'Play it free in class', endSub:'One of 11 money games by IFM',
    shots:[
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:0.2, dur:1.1, motion:'punchin',
        text:{ id:'hook', pos:'top', kicker:'A live classroom game', big:'Run a *real* market', sub:'Teacher projects · students trade', size:108, tdir:'up' } },
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:3.3, dur:0.8, motion:'punchout' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:1.2, motion:'punchin',
        text:{ id:'lead', pos:'bottom', kicker:'👩‍🏫 Teacher view', big:'The *live leaderboard*', size:96, tdir:'up' } },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.6, motion:'shake' },
      { type:'img', src:`${S}/stockrush_player.png`, dur:1.2, motion:'punchin',
        text:{ id:'stud', pos:'bottom', kicker:'📱 Student view', big:'*Buy low,* sell high', size:96, tdir:'up' } },
      { type:'img', src:`${S}/stockrush_player.png`, dur:0.9, motion:'panU' },
      { type:'video', src:`${C}/sd_react.mp4`, in:1.0, dur:0.8, motion:'punchin2' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.9, motion:'panL' },
      { type:'img', src:`${S}/stockrush_player.png`, dur:1.3, motion:'shake',
        text:{ id:'beat', pos:'center', kicker:'5 rounds · 10 years', big:'Beat the *market*', size:124, tdir:'up' } },
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:1.7, dur:0.9, motion:'panR' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:1.3, motion:'punchin',
        text:{ id:'win', pos:'bottom', kicker:'Last one standing', big:'Who *wins?*', size:132, tdir:'up' } },
      { type:'video', src:`${C}/sd_react.mp4`, in:3.0, dur:0.7, motion:'punchout' },
    ],
  },
};
