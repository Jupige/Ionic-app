import { IDataStatable } from "./data-statable.interface";
import { IDataSate } from "./data-state.interface";
import { IDataStateProvider } from "./data-state.provider.interface";
import { IDataRule } from "./data-rule.interface";
import { RowDataModel } from "./row-data.model";

export class CellDataModel implements IDataStatable {
    preValue: string;
    state: IDataSate;
    stateProvider: IDataStateProvider;
    rules?: IDataRule[]

    constructor(
        private row: RowDataModel,
        public fieldName: string,
        private _currentValue: any) {

    }

    public get currentValue() {
        return this._currentValue;
    }

    public set currentValue(value: any) {
        let tmp = this._currentValue;
        this.preValue = tmp;
        this._currentValue = value;

        this.firingDataState();
    }

    public updateByCell(newCell: CellDataModel): boolean {
        if (this.fieldName !== newCell.fieldName)
            return false;

        this.updateByCellValue(newCell.currentValue, newCell.state, newCell.stateProvider);
        return true;
    }

    public updateByCellValue(
        newCellVlue: string,
        state?: IDataSate,
        stateProvider?: IDataStateProvider,
        rules?: IDataRule[]): boolean {
        this.setDataStatable(state, stateProvider, rules);
        this.currentValue = newCellVlue;
        return true;
    }

    public setDataStatable(state?: IDataSate,
        stateProvider?: IDataStateProvider,
        rules?: IDataRule[]) {

        this.state = state;
        this.stateProvider = stateProvider;
        this.rules = rules;
    }

    private firingDataState(): void {
        if (!this.stateProvider || !this.rules)
            return;

        this.state = this.stateProvider.nextCellState(this.row, this);
    }
}