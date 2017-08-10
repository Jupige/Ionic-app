export interface IDataStateProvider {
    nextCellState(row: RowDataModel, cell: CellDataMode): IDataSate;
    nextRowState(row: RowDataModel) : IDataSate;
}