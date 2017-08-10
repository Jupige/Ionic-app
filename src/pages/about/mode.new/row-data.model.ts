import { IDataRule } from "./data-rule.interface";
import { IDataStatable } from "./data-statable.interface";
import { IDataSate, DEFAULT_STATE } from "./data-state.interface";
import { IDataStateProvider } from "./data-state.provider.interface";
import { CellDataModel } from "./cell-data.model";

export class RowDataModel implements IDataStatable {
    cells: Object;
    state: IDataSate;

    constructor(
        public stateProvider: IDataStateProvider,
        rowObj: Object,
        public rules?: IDataRule[]) {
        this.fillObjToCells(rowObj);
    }

    updateByRowObj(rowObj: Object): boolean {
        if (!rowObj)
            return false;

        this.fillObjToCells(rowObj);

        this.firingDataState();

        return true;
    }

    updateByRow(row: RowDataModel): boolean {
        if (!row)
            return false;

        this.cells = row.cells || {};
        this.rules = row.rules;
        this.state = row.state;

        this.firingDataState();

        return true;
    }

    updateByCell(...cells: CellDataModel[]): boolean {
        if (!cells || cells.length === 0)
            return false;
        cells.forEach(c => {
            let oldCell = <CellDataModel>this.cells[c.fieldName];
            if (!oldCell)
                return;

            oldCell.updateByCell(c);
        });

        this.firingDataState();
    }

    updateByCellValues(...cells: CellDataModel[]): boolean {
        if (!cells || cells.length === 0)
            return false;
        cells.forEach(c => {
            let oldCell = <CellDataModel>this.cells[c.fieldName];
            if (!oldCell)
                return;

            oldCell.updateByCell(c);
        });

        this.firingDataState();
    }

    private fillObjToCells(obj: Object): RowDataModel {
        if (!this.cells)
            this.cells = {};

        if (obj && Object.keys(obj)) {
            Object.keys(obj).forEach(k => {
                if (this.cells[k]) {
                    (<CellDataModel>this.cells[k]).currentValue = obj[k];
                } else {
                    this.cells[k] = new CellDataModel(this, k, obj[k]);
                }
            });
        }

        return this;
    }

    private firingDataState(): void {
        if (!this.stateProvider || !this.rules)
            return;

        this.state = this.stateProvider.nextRowState(this);
    }
}