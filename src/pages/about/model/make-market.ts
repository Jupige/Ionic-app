export class IdGenerator {
    public id: number = new Date().getTime() + Math.floor(Math.random() * 100);
}

export class MakeMarketOrder extends IdGenerator {
    public orderItems: any = {};
    public state: MarkertOrderState;

    constructor() {
        super();
        this.state = new MarkertOrderState(() => {
            let updatedCount = 0;
            Object.keys(this.orderItems).forEach(k => {
                let oi = <MarkertOrderItem>this.orderItems[k];
                if (oi.state.isDirtyOrder || oi.state.isUpdateBySystem)
                    updatedCount++;

                if (updatedCount === 2)
                    return 'two-dirty-orders';
            });

            return '';
        });
    }

    static generate(columns: string[]): MakeMarketOrder {
        let o = new MakeMarketOrder();
        columns.forEach(c => {
            o.orderItems[c] = new MarkertOrderItem(c, MakeMarketOrder.randomString(c));
        });

        return o;
    }

    private static randomString(prifix: string) {
        return `${prifix}-${Math.floor(Math.random() * 100)}`;
    }

    public updateOrderByPerson(newItems: MarkertOrderItem[] | { fieldName: string, currentValue: any }[]) {
        if (!newItems || !(newItems instanceof Array)) return;

        (<any>newItems).forEach(newItem => {

            let oldItem = <MarkertOrderItem>this.orderItems[newItem.fieldName];
            if (!oldItem)
                return;

            oldItem.state.isDirtyOrder = this.state.isDirtyOrder = !oldItem.isEqualTo(newItem);
            oldItem.currentValue = newItem.currentValue;
        });
    }

    public updateOrderBySystem(newItems: MarkertOrderItem[] | { fieldName: string, currentValue: any }[]) {
        if (!newItems || !(newItems instanceof Array)) return;

        (<any>newItems).forEach(newItem => {
            let oldItem = <MarkertOrderItem>this.orderItems[newItem.fieldName];
            if (!oldItem)
                return;

            oldItem.state.isUpdateBySystem = this.state.isUpdateBySystem = !oldItem.isEqualTo(newItem);
            oldItem.currentValue = newItem.currentValue;
        });
    }

    public submitedOrder() {
        this.state.isDirtyOrder = false;
    }

    public setNewItem(newOrder: MakeMarketOrder) {
        this.orderItems = newOrder.orderItems;
        this.state = newOrder.state;
        this.id = newOrder.id;
    }
}

export class MarkertOrderItem extends IdGenerator {
    public preValue;
    public state: MarkertOrderState;

    constructor(public fieldName: string, private _currentValue: any) {
        super();
        this.state = new MarkertOrderState(() => {
            if (this.state.isDirtyOrder)
                return 'dirty-item';

            if (this.state.isUpdateBySystem)
                return 'updated-item';

            return '';
        });
    }

    public isEqualTo(target: MarkertOrderItem) {
        return this.fieldName === target.fieldName
            && this.currentValue === target.currentValue;
    }


    public get currentValue() {
        return this._currentValue;
    }

    public set currentValue(value: any) {
        let tmp = this._currentValue;
        this.preValue = tmp;
        this._currentValue = value;
    }
}

export class MarkertOrderState extends IdGenerator {
    public feelClass = '';

    private _isDirtyOrder: boolean;
    private _isUpdateBySystem: boolean;

    constructor(private _compator: () => string) {
        super();
    }

    public get isDirtyOrder() {
        return this._isDirtyOrder;
    }

    public set isDirtyOrder(v: boolean) {
        this._isDirtyOrder = v;
        this.caculateFeelClass();
    }

    public get isUpdateBySystem() {
        return this._isUpdateBySystem;
    }

    public set isUpdateBySystem(v: boolean) {
        this._isUpdateBySystem = v;
        this.caculateFeelClass();
    }

    caculateFeelClass() {
        this.feelClass = this._compator();
    }

    ngDocheck() {
        console.log('ngDocheck');
    }
}

