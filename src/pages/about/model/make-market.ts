export class MakeMarketOrder {
    public orderItems: MarkertOrderItem[] = [];
    public state: MarkertOrderState;

    constructor() {

    }

    static generate(): MakeMarketOrder {
        let o = new MakeMarketOrder();
        o.orderItems.push(new MarkertOrderItem('orderId', Math.floor(Math.random() * 50)));
        o.orderItems.push(new MarkertOrderItem('name', MakeMarketOrder.randomString('Order')));
        o.orderItems.push(new MarkertOrderItem('amount', MakeMarketOrder.randomString('Amount')));

        return o;
    }

    private static randomString(prifix: string) {
        return `${prifix}-${Math.floor(Math.random() * 100)}`;
    }

    public updateOrderByPerson(newItem: MarkertOrderItem) {
        this.state.isDirtyOrder = true;
    }

    public updateOrderBySystem(newItem: MarkertOrderItem) {
        let oldItem = this.orderItems.find(it => it.fieldName === newItem.fieldName);
        if (!oldItem)
            return;

        this.state.isUpdateBySystem = oldItem.isEqualTo(newItem);
        this.setNewOrder(newOrder);
        this.orderFeelClass = this.getOrderFeelClass();
    }

    public submitedOrder() {
        this.isDirtyOrder = false;
        this.orderFeelClass = this.getOrderFeelClass();
    }

    public getOrderFeelClass() {
        if (this.isDirtyOrder)
            return 'dirty-order';

        if (this.isUpdateBySystem) {
            return 'update-order';
        }
    }

    private setNewOrder(newOrder: MakeMarketOrder) {
        if (!this._preItem)
            this._preItem = new MakeMarketOrder();

        this.cloneOrderTo(this, this._preItem);
        this.cloneOrderTo(newOrder, this);
    }

    private cloneOrderTo(from: MakeMarketOrder, to: MakeMarketOrder) {
        if (!from || !to)
            return;

        Object.keys(to)
            .forEach(k => {
                to[k] = from[k];
            });
    }
}

export class MarkertOrderItem {
    public preValue;
    public state: MarkertOrderState;

    constructor(public fieldName: string, public currentValue: any) {

    }

    public isEqualTo(target: MarkertOrderItem) {
        return this.fieldName === target.fieldName
            && this.currentValue === target.currentValue;
    }
}

export class MarkertOrderState {
    public feelClass = '';

    private _isDirtyOrder: boolean;
    private _isUpdateBySystem: boolean;

    constructor(private _compator: () => string) {
    }

    public get isDirtyOrder() {
        return this._isDirtyOrder;
    }

    public set isDirtyOrder(v: boolean) {
        this._isDirtyOrder = v;
    }

    public get isUpdateBySystem() {
        return this._isUpdateBySystem;
    }

    public set isUpdateBySystem(v: boolean) {
        this._isUpdateBySystem = v;
    }

    caculateFeelClass() {
        this.feelClass = this._compator();
    }
}