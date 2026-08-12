const markets = [
    ['BULL MARKET','1012.1952','cyan','▲'],['BEAR MARKET','1017.0315','orange','▼'],['VOL 50','152.564','green','▲'],['VOL 150','892.423','blue','▼'],['VOL 75','34355.2006','blue','▲'],['VOL 100','1020.2018','red','▼'],['VOL 10','10098.0944','yellow','▲'],['VOL 25','2854.0272','green','▼'],
];
const PremiumTicker = ({ light = false }: { light?: boolean }) => {
    const items = [...markets, ...markets];
    return <div className={`prodb-ticker ${light ? 'prodb-ticker--light' : ''}`} aria-label='Market ticker'><div className='prodb-ticker__track'>{[0,1].map(set => <div className='prodb-ticker__set' key={set} aria-hidden={set === 1}>{items.map(([label,value,tone,arrow],index) => <span className={`prodb-ticker__item prodb-ticker__item--${tone}`} key={`${set}-${index}`}><b>{label}</b><span>{value}</span><i className={arrow === '▲' ? 'up' : 'down'}>{arrow}</i></span>)}</div>)}</div></div>;
};
export default PremiumTicker;
