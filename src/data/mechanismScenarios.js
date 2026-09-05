export const MECHANISM_SCENARIOS=Object.freeze([
  {
    id:'proton-transfer',shortName:'PT',family:'Acid–base',title:'Move a proton without losing the electron pair',equation:'NH₃ + H–Cl → NH₄⁺ + Cl⁻',arrowCount:2,
    learningOutcome:'Connect a Lewis-base lone pair to an acidic hydrogen while the donor bond breaks heterolytically.',
    boundary:'This drawing represents the proton-transfer event only. Solvent reorganization, encounter dynamics, equilibrium, and rate are not modeled.',
    simultaneousReason:'The N–H bond forms while the H–Cl pair moves to chlorine. Committing only one arrow either overfills hydrogen or loses the heterolytic electron pair.',
    atoms:[
      {id:'pt-n',label:'N',element:'N',x:225,y:250,charge:0,tone:'nitrogen'},{id:'pt-h1',label:'H',element:'H',x:130,y:185},{id:'pt-h2',label:'H',element:'H',x:130,y:315},{id:'pt-h3',label:'H',element:'H',x:225,y:365},
      {id:'pt-ha',label:'H',element:'H',x:555,y:250,partialCharge:'δ+'},{id:'pt-cl',label:'Cl',element:'Cl',x:715,y:250,partialCharge:'δ−',tone:'halogen'},
    ],
    bonds:[{id:'pt-nh1',a:'pt-n',b:'pt-h1',order:1},{id:'pt-nh2',a:'pt-n',b:'pt-h2',order:1},{id:'pt-nh3',a:'pt-n',b:'pt-h3',order:1},{id:'pt-hcl',a:'pt-ha',b:'pt-cl',order:1,polar:true}],
    sources:[
      {id:'pt-n-lp',type:'lonePair',label:'nitrogen lone pair',x:300,y:250,atomId:'pt-n'},
      {id:'pt-hcl-sigma',type:'sigmaBond',label:'H–Cl sigma bond',x:635,y:250,bondId:'pt-hcl'},
    ],
    targets:[
      {id:'pt-target-h',type:'atom',label:'acidic hydrogen',x:555,y:250,atomId:'pt-ha'},
      {id:'pt-target-cl',type:'atom',label:'chlorine',x:715,y:250,atomId:'pt-cl'},
      {id:'pt-target-n',type:'atom',label:'nitrogen',x:225,y:250,atomId:'pt-n'},
    ],
    expectedArrows:[
      {id:'pt-arrow-form',sourceId:'pt-n-lp',targetId:'pt-target-h',role:'Form the new N–H bond',effect:'The nitrogen lone pair becomes the N–H bonding pair.',explanation:'The arrow starts at the nitrogen lone pair and ends at the proton because that pair forms the new N–H bond.'},
      {id:'pt-arrow-break',sourceId:'pt-hcl-sigma',targetId:'pt-target-cl',role:'Return the H–Cl pair to chlorine',effect:'The H–Cl bond breaks heterolytically and chlorine receives both electrons.',explanation:'The H–Cl bonding pair goes to chlorine, the fragment that becomes Cl⁻.'},
    ],
    distractorReasons:{
      'pt-n-lp->pt-target-cl':'The nitrogen pair must form a bond to the transferred proton. Sending it to chlorine does not move the proton between binding sites.',
      'pt-hcl-sigma->pt-target-h':'Heterolytic cleavage toward hydrogen would assign both bonding electrons to H and produce hydride, not the shown proton-transfer products.',
      'pt-hcl-sigma->pt-target-n':'The H–Cl pair belongs on the leaving chlorine. The new N–H bond is supplied by the nitrogen lone pair.',
    },
    product:{notation:'NH₄⁺ + Cl⁻',title:'Proton transferred',summary:'Nitrogen used its lone pair to bind H; chlorine retained the original H–Cl pair.'},
    ledger:[{kind:'bond-formed',text:'N–H bond formed (+1 bond order)'},{kind:'bond-broken',text:'H–Cl bond broken (−1 bond order)'},{kind:'charge',text:'N: 0 → +1; Cl: 0 → −1'}],
  },
  {
    id:'sn2-substitution',shortName:'SN2',family:'Nucleophilic substitution',title:'Coordinate bond making with leaving-group departure',equation:'HO⁻ + CH₃–Br → CH₃OH + Br⁻',arrowCount:2,
    learningOutcome:'Queue the entering and leaving electron pairs for one concerted substitution step.',
    boundary:'This is one preselected methyl-substitution template. Solvent, activation barrier, collision geometry, rate law, and competing pathways are not calculated.',
    simultaneousReason:'The oxygen pair cannot form C–O while carbon keeps all four original bonds. The C–Br pair must leave for bromine in the same elementary-step commit.',
    atoms:[
      {id:'sn-o',label:'O',element:'O',x:155,y:250,charge:-1,tone:'oxygen'},{id:'sn-oh',label:'H',element:'H',x:65,y:250},
      {id:'sn-c',label:'C',element:'C',x:515,y:250,tone:'carbon'},{id:'sn-h1',label:'H',element:'H',x:455,y:145},{id:'sn-h2',label:'H',element:'H',x:455,y:355},{id:'sn-h3',label:'H',element:'H',x:515,y:390},{id:'sn-br',label:'Br',element:'Br',x:720,y:250,tone:'halogen'},
    ],
    bonds:[{id:'sn-oh-bond',a:'sn-o',b:'sn-oh',order:1},{id:'sn-ch1',a:'sn-c',b:'sn-h1',order:1},{id:'sn-ch2',a:'sn-c',b:'sn-h2',order:1},{id:'sn-ch3',a:'sn-c',b:'sn-h3',order:1},{id:'sn-cbr',a:'sn-c',b:'sn-br',order:1,polar:true}],
    sources:[
      {id:'sn-o-lp',type:'lonePair',label:'oxygen lone pair',x:230,y:250,atomId:'sn-o'},
      {id:'sn-cbr-sigma',type:'sigmaBond',label:'C–Br sigma bond',x:618,y:250,bondId:'sn-cbr'},
    ],
    targets:[
      {id:'sn-target-c',type:'atom',label:'methyl carbon',x:515,y:250,atomId:'sn-c'},
      {id:'sn-target-br',type:'atom',label:'bromine',x:720,y:250,atomId:'sn-br'},
      {id:'sn-target-h',type:'atom',label:'methyl hydrogen',x:455,y:145,atomId:'sn-h1'},
    ],
    expectedArrows:[
      {id:'sn-arrow-form',sourceId:'sn-o-lp',targetId:'sn-target-c',role:'Form the C–O bond',effect:'The oxygen lone pair becomes the entering C–O bonding pair.',explanation:'The nucleophile donates both electrons to the electrophilic methyl carbon.'},
      {id:'sn-arrow-leave',sourceId:'sn-cbr-sigma',targetId:'sn-target-br',role:'Send the C–Br pair to bromine',effect:'The C–Br bond breaks heterolytically and Br becomes Br⁻.',explanation:'The leaving group retains both electrons of the C–Br bond.'},
    ],
    distractorReasons:{
      'sn-o-lp->sn-target-br':'Bromine is the leaving group in the shown substitution, not the electrophilic carbon that receives the entering oxygen pair.',
      'sn-o-lp->sn-target-h':'This template is substitution at methyl carbon, not proton transfer from a methyl C–H bond.',
      'sn-cbr-sigma->sn-target-c':'Returning the C–Br pair to carbon would describe cleavage toward carbon, not formation of Br⁻ as the shown nucleofuge.',
      'sn-cbr-sigma->sn-target-h':'The leaving C–Br pair cannot end on an unrelated C–H hydrogen.',
    },
    product:{notation:'CH₃OH + Br⁻',title:'Substitution arrow set complete',summary:'The entering oxygen pair forms C–O while bromine retains the departing C–Br pair.'},
    ledger:[{kind:'bond-formed',text:'C–O bond formed (+1 bond order)'},{kind:'bond-broken',text:'C–Br bond broken (−1 bond order)'},{kind:'charge',text:'O: −1 → 0; Br: 0 → −1'}],
  },
  {
    id:'carbonyl-addition',shortName:'C=O',family:'Nucleophilic addition',title:'Add to carbonyl carbon and protect its octet',equation:'CN⁻ + H₂C=O → N≡C–CH₂–O⁻',arrowCount:2,
    learningOutcome:'Pair nucleophilic bond formation with movement of the carbonyl pi pair to oxygen.',
    boundary:'The cyanide/formaldehyde drawing is a formal electron-accounting template. Solvent, reversibility, protonation, toxicity, kinetics, and synthetic use are outside scope.',
    simultaneousReason:'Carbonyl carbon already has an octet. Forming C–C without moving the C=O pi pair would exceed that octet, so the pi electrons must move to oxygen in the same commit.',
    atoms:[
      {id:'ca-n',label:'N',element:'N',x:75,y:250,tone:'nitrogen'},{id:'ca-cn-c',label:'C',element:'C',x:225,y:250,charge:-1,tone:'carbon'},
      {id:'ca-co-c',label:'C',element:'C',x:525,y:250,tone:'carbon'},{id:'ca-o',label:'O',element:'O',x:700,y:250,tone:'oxygen'},{id:'ca-h1',label:'H',element:'H',x:475,y:145},{id:'ca-h2',label:'H',element:'H',x:475,y:355},
    ],
    bonds:[{id:'ca-cn',a:'ca-n',b:'ca-cn-c',order:3},{id:'ca-co',a:'ca-co-c',b:'ca-o',order:2,polar:true},{id:'ca-ch1',a:'ca-co-c',b:'ca-h1',order:1},{id:'ca-ch2',a:'ca-co-c',b:'ca-h2',order:1}],
    sources:[
      {id:'ca-cn-lp',type:'lonePair',label:'cyanide carbon lone pair',x:300,y:250,atomId:'ca-cn-c'},
      {id:'ca-co-pi',type:'piBond',label:'C=O pi bond',x:610,y:220,bondId:'ca-co'},
    ],
    targets:[
      {id:'ca-target-carbonyl-c',type:'atom',label:'carbonyl carbon',x:525,y:250,atomId:'ca-co-c'},
      {id:'ca-target-o',type:'atom',label:'carbonyl oxygen',x:700,y:250,atomId:'ca-o'},
      {id:'ca-target-carbonyl-bond',type:'bond',label:'C=O bond region',x:610,y:250,bondId:'ca-co'},
    ],
    expectedArrows:[
      {id:'ca-arrow-form',sourceId:'ca-cn-lp',targetId:'ca-target-carbonyl-c',role:'Form the new C–C bond',effect:'The cyanide carbon pair becomes a bond to carbonyl carbon.',explanation:'The nucleophilic carbon donates its pair to the electrophilic carbonyl carbon.'},
      {id:'ca-arrow-pi',sourceId:'ca-co-pi',targetId:'ca-target-o',role:'Move the carbonyl pi pair to oxygen',effect:'C=O bond order falls from two to one and oxygen receives the pair.',explanation:'Moving the pi pair to oxygen preserves carbon’s octet and produces the alkoxide.'},
    ],
    distractorReasons:{
      'ca-cn-lp->ca-target-o':'The shown nucleophilic addition forms a bond at electrophilic carbonyl carbon. Sending the pair to oxygen does not create the displayed carbon skeleton.',
      'ca-cn-lp->ca-target-carbonyl-bond':'The new sigma bond ends at carbonyl carbon, not in the existing C=O bond region.',
      'ca-co-pi->ca-target-carbonyl-c':'Moving the pi pair toward carbon would assign extra electron density to carbon while leaving oxygen without the shown alkoxide charge.',
      'ca-co-pi->ca-target-carbonyl-bond':'An arrow cannot leave the carbonyl pi pair in the same bond; the pair must move to oxygen when the bond order falls.',
    },
    product:{notation:'N≡C–CH₂–O⁻',title:'Carbonyl-addition arrow set complete',summary:'A new C–C bond forms while the carbonyl pi pair becomes an oxygen lone pair.'},
    ledger:[{kind:'bond-formed',text:'C(cyanide)–C(carbonyl) bond formed (+1)'},{kind:'bond-order',text:'C=O bond order 2 → 1'},{kind:'charge',text:'cyanide C: −1 → 0; O: 0 → −1'}],
  },
  {
    id:'e2-elimination',shortName:'E2',family:'Beta elimination',title:'Move three pairs through one antiperiplanar step',equation:'EtO⁻ + CH₃CH₂Br → CH₂=CH₂ + EtOH + Br⁻',arrowCount:3,
    learningOutcome:'Coordinate proton abstraction, pi-bond formation, and leaving-group departure in one step.',
    boundary:'The substrate is drawn in a supplied antiperiplanar conformation. The 2D template does not search conformations, compare bases, predict regioselectivity, or calculate competition with substitution.',
    simultaneousReason:'E2 requires all three electron-pair changes together: base to beta H, C–H pair into C=C, and C–Br pair to Br. A partial set leaves an impossible valence or an unaccounted electron pair.',
    atoms:[
      {id:'e2-o',label:'O',element:'O',x:100,y:250,charge:-1,tone:'oxygen'},{id:'e2-et',label:'Et',element:'group',x:35,y:350,tone:'group'},
      {id:'e2-cb',label:'Cβ',element:'C',x:420,y:250,tone:'carbon'},{id:'e2-ca',label:'Cα',element:'C',x:585,y:250,tone:'carbon'},{id:'e2-hb',label:'Hβ',element:'H',x:420,y:92},{id:'e2-br',label:'Br',element:'Br',x:745,y:250,tone:'halogen'},
      {id:'e2-h1',label:'H₂',element:'group',x:340,y:350,tone:'group'},{id:'e2-h2',label:'H₂',element:'group',x:650,y:350,tone:'group'},
    ],
    bonds:[{id:'e2-oet',a:'e2-o',b:'e2-et',order:1},{id:'e2-cbc',a:'e2-cb',b:'e2-ca',order:1},{id:'e2-cbh',a:'e2-cb',b:'e2-hb',order:1,geometry:'anti'},{id:'e2-cabr',a:'e2-ca',b:'e2-br',order:1,geometry:'anti'},{id:'e2-cbh2',a:'e2-cb',b:'e2-h1',order:1},{id:'e2-cah2',a:'e2-ca',b:'e2-h2',order:1}],
    sources:[
      {id:'e2-o-lp',type:'lonePair',label:'ethoxide oxygen lone pair',x:180,y:250,atomId:'e2-o'},
      {id:'e2-ch-sigma',type:'sigmaBond',label:'beta C–H sigma bond',x:420,y:171,bondId:'e2-cbh'},
      {id:'e2-cbr-sigma',type:'sigmaBond',label:'C–Br sigma bond',x:665,y:250,bondId:'e2-cabr'},
    ],
    targets:[
      {id:'e2-target-h',type:'atom',label:'antiperiplanar beta hydrogen',x:420,y:92,atomId:'e2-hb'},
      {id:'e2-target-cc',type:'bond',label:'Cα–Cβ bond region',x:502,y:250,bondId:'e2-cbc'},
      {id:'e2-target-br',type:'atom',label:'bromine',x:745,y:250,atomId:'e2-br'},
      {id:'e2-target-ca',type:'atom',label:'alpha carbon',x:585,y:250,atomId:'e2-ca'},
    ],
    expectedArrows:[
      {id:'e2-arrow-base',sourceId:'e2-o-lp',targetId:'e2-target-h',role:'Abstract the antiperiplanar beta H',effect:'The oxygen lone pair becomes the O–H bond.',explanation:'The base pair ends at beta hydrogen to form EtOH.'},
      {id:'e2-arrow-pi',sourceId:'e2-ch-sigma',targetId:'e2-target-cc',role:'Turn the C–H pair into the C=C pi bond',effect:'The beta C–H bond breaks as Cα–Cβ bond order rises from one to two.',explanation:'The C–H bonding pair forms the new pi bond between the adjacent carbons.'},
      {id:'e2-arrow-leave',sourceId:'e2-cbr-sigma',targetId:'e2-target-br',role:'Send the C–Br pair to bromine',effect:'The C–Br bond breaks heterolytically and Br becomes Br⁻.',explanation:'Bromine retains both electrons of the departing C–Br bond.'},
    ],
    distractorReasons:{
      'e2-o-lp->e2-target-ca':'The base abstracts the supplied antiperiplanar beta hydrogen; attacking alpha carbon would be a substitution proposal, not this E2 template.',
      'e2-o-lp->e2-target-br':'The base pair must form O–H. Bromine receives the separate C–Br bonding pair.',
      'e2-ch-sigma->e2-target-h':'Leaving the C–H pair on hydrogen would give hydride rather than create the alkene pi bond.',
      'e2-ch-sigma->e2-target-br':'The beta C–H pair forms C=C; the C–Br pair is the one that ends on bromine.',
      'e2-cbr-sigma->e2-target-cc':'The departing C–Br pair belongs to bromine, not the new carbon-carbon pi bond.',
    },
    product:{notation:'CH₂=CH₂ + EtOH + Br⁻',title:'E2 arrow set complete',summary:'Three electron pairs move together through the supplied antiperiplanar arrangement.'},
    ledger:[{kind:'bond-formed',text:'O–H bond formed (+1)'},{kind:'bond-broken',text:'Cβ–H bond broken (−1)'},{kind:'bond-order',text:'Cα–Cβ bond order 1 → 2'},{kind:'bond-broken',text:'Cα–Br bond broken (−1)'},{kind:'charge',text:'O: −1 → 0; Br: 0 → −1'}],
  },
]);
